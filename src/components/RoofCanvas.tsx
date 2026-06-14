import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Text as KonvaText } from 'react-konva';
import {
  Card,
  Group as MantineGroup,
  Text,
  ActionIcon,
  Tooltip,
  Alert,
  Switch,
  SegmentedControl,
  Badge,
} from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import {
  getRoofBoundaryPoints,
  isPointInRoof,
  validateSingleTileAdjustment,
} from '@/domains/layout';
import type { Tile, SelectionMode } from '@/types';
import {
  IconZoomIn,
  IconZoomOut,
  IconZoomCancel,
  IconAlertTriangle,
  IconListNumbers,
  IconEye,
  IconEyeOff,
  IconSelectAll,
  IconFocusCentered,
} from '@tabler/icons-react';
import Konva from 'konva';
import { useHighlight } from '@/hooks/useHighlight';

const STAGE_PADDING = 40;
const SCALE_STEP = 0.1;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

export default function RoofCanvas() {
  const roof = useRoofStore((s) => s.roof);
  const layout = useRoofStore((s) => s.layout);
  const tiles = useRoofStore((s) => s.tiles);
  const selectionMode = useRoofStore((s) => s.selectionMode);
  const setSelectionMode = useRoofStore((s) => s.setSelectionMode);
  const setSelectedTile = useRoofStore((s) => s.setSelectedTile);
  const toggleTileSelection = useRoofStore((s) => s.toggleTileSelection);
  const clearTileSelection = useRoofStore((s) => s.clearTileSelection);
  const selectTilesInRect = useRoofStore((s) => s.selectTilesInRect);
  const setManualAdjustment = useRoofStore((s) => s.setManualAdjustment);
  const validationResult = useRoofStore((s) => s.validationResult);
  const lastValidationMessage = useRoofStore((s) => s.lastValidationMessage);
  const showTileNumbers = useRoofStore((s) => s.showTileNumbers);
  const toggleShowTileNumbers = useRoofStore((s) => s.toggleShowTileNumbers);
  const numberingResult = useRoofStore((s) => s.numberingResult);
  const focusedTileId = useRoofStore((s) => s.focusedTileId);
  const setFocusedTile = useRoofStore((s) => s.setFocusedTile);
  const selectedTileId = useRoofStore((s) => s.selectedTileId);

  const highlight = useHighlight();

  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [stageSize, setStageSize] = useState({ width: 600, height: 500 });
  const [offset, setOffset] = useState({ x: STAGE_PADDING, y: STAGE_PADDING });
  const [dragErrorMessage, setDragErrorMessage] = useState<string>('');

  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxStart, setBoxStart] = useState({ x: 0, y: 0 });
  const [boxEnd, setBoxEnd] = useState({ x: 0, y: 0 });

  const boundaryPoints = getRoofBoundaryPoints(roof);
  const boundaryFlatPoints = boundaryPoints.flatMap((p) => [p.x, p.y]);

  const cutTypeLabel = (tile: Tile): string => {
    if (!tile.isCut) return '';
    switch (tile.cutType) {
      case 'left':
        return '◀';
      case 'right':
        return '▶';
      case 'top':
        return '▲';
      case 'bottom':
        return '▼';
      case 'both':
        return '◀▶';
      default:
        return '✂';
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const availableWidth = rect.width - STAGE_PADDING * 2;
    const availableHeight = rect.height - STAGE_PADDING * 2;

    const scaleX = availableWidth / roof.width;
    const scaleY = availableHeight / roof.height;
    const newScale = Math.min(scaleX, scaleY, 1);

    const scaledWidth = roof.width * newScale;
    const scaledHeight = roof.height * newScale;
    const offsetX = (rect.width - scaledWidth) / 2;
    const offsetY = (rect.height - scaledHeight) / 2;

    setScale(newScale);
    setOffset({ x: offsetX, y: offsetY });
  }, [roof.width, roof.height]);

  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setStageSize({
            width: rect.width,
            height: rect.height,
          });
          fitToScreen();
        }
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, [fitToScreen]);

  const handleZoom = useCallback((delta: number) => {
    setScale((prev) => {
      const newScale = prev + delta;
      return Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    fitToScreen();
  }, [fitToScreen]);

  const handleTileClick = useCallback(
    (tile: Tile, _e: Konva.KonvaEventObject<MouseEvent>) => {
      if (selectionMode === 'single') {
        setSelectedTile(tile.id);
        setFocusedTile(tile.id);
      } else if (selectionMode === 'multi') {
        toggleTileSelection(tile.id);
        setFocusedTile(tile.id);
      }
    },
    [selectionMode, setSelectedTile, toggleTileSelection, setFocusedTile]
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, tile: Tile) => {
      if (selectionMode !== 'single') {
        e.target.x(tile.x);
        e.target.y(tile.y);
        return;
      }
      const node = e.target;
      let newX = node.x();
      let newY = node.y();

      const tileCenterX = newX + tile.width / 2;
      const tileCenterY = newY + tile.height / 2;

      if (!isPointInRoof(roof, tileCenterX, tileCenterY)) {
        node.x(tile.x);
        node.y(tile.y);
        setDragErrorMessage('瓦片不能移出屋面区域');
        setTimeout(() => setDragErrorMessage(''), 3000);
        return;
      }

      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX + tile.width > roof.width) newX = roof.width - tile.width;
      if (newY + tile.height > roof.height) newY = roof.height - tile.height;

      const validation = validateSingleTileAdjustment(
        tile.id,
        newX,
        newY,
        layout.tiles,
        tiles
      );

      if (!validation.isValid) {
        node.x(tile.x);
        node.y(tile.y);
        setDragErrorMessage(`调整被拦截：${validation.message}`);
        setTimeout(() => setDragErrorMessage(''), 3000);
        return;
      }

      node.x(newX);
      node.y(newY);

      const result = setManualAdjustment(tile.id, newX, newY);
      if (!result.success) {
        setDragErrorMessage(result.message);
        setTimeout(() => setDragErrorMessage(''), 3000);
      } else {
        setDragErrorMessage('');
      }
    },
    [roof, setManualAdjustment, layout.tiles, tiles, selectionMode]
  );

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== e.target.getStage()) return;

      if (selectionMode === 'box') {
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;
        const stage = e.target.getStage();
        if (!stage) return;

        const x = (pos.x - offset.x) / scale;
        const y = (pos.y - offset.y) / scale;

        setIsBoxSelecting(true);
        setBoxStart({ x, y });
        setBoxEnd({ x, y });
      } else if (selectionMode === 'single') {
        setSelectedTile(null);
        setFocusedTile(null);
      } else {
        clearTileSelection();
        setFocusedTile(null);
      }
    },
    [selectionMode, offset, scale, setSelectedTile, clearTileSelection, setFocusedTile]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isBoxSelecting) return;

      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const x = (pos.x - offset.x) / scale;
      const y = (pos.y - offset.y) / scale;

      setBoxEnd({ x, y });
    },
    [isBoxSelecting, offset, scale]
  );

  const handleStageMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isBoxSelecting) return;

      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const x = (pos.x - offset.x) / scale;
      const y = (pos.y - offset.y) / scale;

      selectTilesInRect(boxStart.x, boxStart.y, x, y);
      setIsBoxSelecting(false);
    },
    [isBoxSelecting, boxStart, offset, scale, selectTilesInRect]
  );

  const selectionModeOptions = [
    { value: 'single', label: '单选' },
    { value: 'multi', label: '多选' },
    { value: 'box', label: '框选' },
  ];

  const boxX = Math.min(boxStart.x, boxEnd.x);
  const boxY = Math.min(boxStart.y, boxEnd.y);
  const boxWidth = Math.abs(boxEnd.x - boxStart.x);
  const boxHeight = Math.abs(boxEnd.y - boxStart.y);

  const selectedTile = layout.tiles.find((t) => t.id === selectedTileId);

  return (
    <Card
      withBorder
      shadow="sm"
      radius="md"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Card.Section
        withBorder
        p="xs"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <MantineGroup gap="xs">
          <Tooltip label="放大">
            <ActionIcon variant="light" onClick={() => handleZoom(SCALE_STEP)}>
              <IconZoomIn size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="缩小">
            <ActionIcon variant="light" onClick={() => handleZoom(-SCALE_STEP)}>
              <IconZoomOut size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="适应画布">
            <ActionIcon variant="light" onClick={handleResetZoom}>
              <IconZoomCancel size={18} />
            </ActionIcon>
          </Tooltip>
          <Text size="sm" c="dimmed">
            缩放: {(scale * 100).toFixed(0)}%
          </Text>
        </MantineGroup>

        <MantineGroup gap="md">
          <MantineGroup gap="xs">
            <Tooltip
              label={
                selectionMode === 'single'
                  ? '单选模式'
                  : selectionMode === 'multi'
                  ? '多选模式'
                  : '框选模式'
              }
            >
              <SegmentedControl
                size="xs"
                value={selectionMode}
                onChange={(v) => setSelectionMode(v as SelectionMode)}
                data={selectionModeOptions}
              />
            </Tooltip>
            {selectionMode === 'multi' && highlight.selectionContext.selectedCount > 0 && (
              <Tooltip label="清除选择">
                <ActionIcon
                  size="xs"
                  variant="light"
                  color="gray"
                  onClick={clearTileSelection}
                >
                  <IconFocusCentered size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </MantineGroup>

          <MantineGroup gap="xs">
            <IconListNumbers size={16} />
            <Switch
              size="sm"
              checked={showTileNumbers}
              onChange={toggleShowTileNumbers}
              offLabel={
                <ActionIcon size="xs" variant="transparent" color="gray">
                  <IconEyeOff size={12} />
                </ActionIcon>
              }
              onLabel={
                <ActionIcon size="xs" variant="transparent" color="white">
                  <IconEye size={12} />
                </ActionIcon>
              }
            />
            <Text size="xs" c="dimmed">
              编号
            </Text>
          </MantineGroup>
        </MantineGroup>
      </Card.Section>

      {highlight.label && (
        <Card.Section
          p="xs"
          withBorder
          style={{ background: 'rgba(236, 253, 245, 0.5)' }}
        >
          <MantineGroup justify="space-between">
            <Badge size="sm" variant="light" color={highlight.label.color}>
              {highlight.label.text}
            </Badge>
            <Text size="xs" c="dimmed">
              {highlight.highlightSource === 'step' &&
                `第 ${highlight.stepContext.highlightedStepNumber} 步 / 共 ${highlight.stepContext.totalSteps} 步`}
              {highlight.highlightSource === 'material' &&
                `共 ${highlight.materialContext.highlightedGroupTileIds.length} 块瓦片`}
              {highlight.highlightSource === 'selection' &&
                `共 ${highlight.selectionContext.totalCount} 块瓦片`}
            </Text>
          </MantineGroup>
        </Card.Section>
      )}

      {!validationResult.isValid && (
        <Card.Section p="xs" withBorder>
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="排布异常"
            color="red"
            variant="light"
          >
            <Text size="sm">
              检测到 {validationResult.invalidTileIds.length}{' '}
              块瓦片存在搭接约束违规，已用红色高亮显示。请调整相关瓦片位置或重置到原始位置。
            </Text>
          </Alert>
        </Card.Section>
      )}

      {dragErrorMessage && (
        <Card.Section p="xs" withBorder>
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="调整拦截"
            color="orange"
            variant="light"
          >
            <Text size="sm">{dragErrorMessage}</Text>
          </Alert>
        </Card.Section>
      )}

      {lastValidationMessage && !dragErrorMessage && validationResult.isValid && (
        <Card.Section p="xs" withBorder>
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="提示"
            color="blue"
            variant="light"
            withCloseButton
            onClose={() => {}}
          >
            <Text size="sm">{lastValidationMessage}</Text>
          </Alert>
        </Card.Section>
      )}

      <Card.Section
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={offset.x}
          y={offset.y}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={() => isBoxSelecting && setIsBoxSelecting(false)}
          style={{ background: '#f8fafc' }}
        >
          <Layer>
            <Line
              points={boundaryFlatPoints as number[]}
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth={2}
              closed
            />

            {layout.tiles.map((tile) => {
              const numbering = numberingResult.numberingMap[tile.id];
              const fontSize = Math.max(8, Math.min(tile.width / 6, 14));
              const selected = highlight.isTileSelected(tile.id);
              const isDraggable = selectionMode === 'single' && selected;
              const colors = highlight.getTileColors(tile);

              return (
                <React.Fragment key={tile.id}>
                  <Rect
                    x={tile.x}
                    y={tile.y}
                    width={tile.width}
                    height={tile.height}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={colors.strokeWidth}
                    draggable={isDraggable}
                    onClick={(e) => handleTileClick(tile, e)}
                    onMouseEnter={() => setFocusedTile(tile.id)}
                    onMouseLeave={() =>
                      focusedTileId === tile.id && setFocusedTile(null)
                    }
                    onDragEnd={(e) => handleDragEnd(e, tile)}
                    shadowColor={colors.shadowColor}
                    shadowBlur={colors.shadowBlur}
                    shadowOffsetX={1}
                    shadowOffsetY={1}
                  />
                  {showTileNumbers && tile.width > 20 && tile.height > 20 && (
                    <>
                      <KonvaText
                        x={tile.x}
                        y={tile.y + 2}
                        width={tile.width}
                        text={numbering ? `${numbering.rowNumber}-${numbering.colNumber}` : ''}
                        fontSize={fontSize}
                        fontStyle="bold"
                        fill="#ffffff"
                        align="center"
                        shadowColor="rgba(0,0,0,0.8)"
                        shadowBlur={2}
                        listening={false}
                      />
                      {tile.isCut && (
                        <KonvaText
                          x={tile.x}
                          y={tile.y + tile.height - fontSize - 2}
                          width={tile.width}
                          text={cutTypeLabel(tile)}
                          fontSize={fontSize}
                          fontStyle="bold"
                          fill="#fff176"
                          align="center"
                          shadowColor="rgba(0,0,0,0.8)"
                          shadowBlur={2}
                          listening={false}
                        />
                      )}
                    </>
                  )}
                  {selected && selectionMode !== 'single' && (
                    <Rect
                      x={tile.x - 2}
                      y={tile.y - 2}
                      width={tile.width + 4}
                      height={tile.height + 4}
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      dash={[4, 4]}
                      listening={false}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {selectedTile && selectionMode === 'single' && (
              <Rect
                x={selectedTile.x}
                y={selectedTile.y}
                width={selectedTile.width}
                height={selectedTile.height}
                stroke="#3b82f6"
                strokeWidth={3}
                dash={[5, 5]}
                listening={false}
              />
            )}

            {isBoxSelecting && (
              <Rect
                x={boxX}
                y={boxY}
                width={boxWidth}
                height={boxHeight}
                fill="rgba(59, 130, 246, 0.15)"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dash={[4, 4]}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </Card.Section>

      <Card.Section p="xs" withBorder>
        <MantineGroup justify="space-between">
          <Text size="xs" c="dimmed">
            {selectionMode === 'single' && '点击瓦片选中，拖拽可调整位置'}
            {selectionMode === 'multi' && '点击瓦片切换选择状态，支持多选'}
            {selectionMode === 'box' && '在空白处按住鼠标拖动画框选择瓦片'}
          </Text>
          {highlight.selectionContext.selectedCount > 0 && selectionMode !== 'single' && (
            <Badge size="sm" variant="light" color="blue">
              已选 {highlight.selectionContext.selectedCount} /{' '}
              {highlight.selectionContext.totalCount}
            </Badge>
          )}
        </MantineGroup>
      </Card.Section>
    </Card>
  );
}

void IconSelectAll;
