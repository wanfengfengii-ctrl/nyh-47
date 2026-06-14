import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Text as KonvaText } from 'react-konva';
import { Card, Group as MantineGroup, Text, ActionIcon, Tooltip, Alert, Switch, SegmentedControl, Badge } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { getRoofBoundaryPoints, isPointInRoof, validateSingleTileAdjustment } from '@/utils/roofCalculator';
import type { Tile, SelectionMode } from '@/types';
import { IconZoomIn, IconZoomOut, IconZoomCancel, IconAlertTriangle, IconListNumbers, IconEye, IconEyeOff, IconMouse, IconSelectAll, IconSelect, IconFocusCentered } from '@tabler/icons-react';
import Konva from 'konva';

const STAGE_PADDING = 40;
const SCALE_STEP = 0.1;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

export default function RoofCanvas() {
  const {
    roof,
    layout,
    selectedTileId,
    selectedTileIds,
    selectionMode,
    setSelectionMode,
    setSelectedTile,
    toggleTileSelection,
    clearTileSelection,
    selectTilesInRect,
    setManualAdjustment,
    tiles,
    validationResult,
    lastValidationMessage,
    showTileNumbers,
    toggleShowTileNumbers,
    numberingResult,
    highlightedStepNumber,
    constructionSequence,
    highlightedMaterialGroupTileIds,
    highlightSource,
    focusedTileId,
    setFocusedTile,
  } = useRoofStore();

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

  const highlightedTileIds = useMemo(() => {
    const ids = new Set<string>();
    if (highlightedStepNumber !== null) {
      const step = constructionSequence.steps.find(s => s.stepNumber === highlightedStepNumber);
      if (step) step.tileIds.forEach(id => ids.add(id));
    }
    highlightedMaterialGroupTileIds.forEach(id => ids.add(id));
    if (selectionMode !== 'single' && selectedTileIds.length > 0) {
      selectedTileIds.forEach(id => ids.add(id));
    }
    return ids;
  }, [highlightedStepNumber, constructionSequence.steps, highlightedMaterialGroupTileIds, selectedTileIds, selectionMode]);

  const cutTypeLabel = (tile: Tile): string => {
    if (!tile.isCut) return '';
    switch (tile.cutType) {
      case 'left': return '◀';
      case 'right': return '▶';
      case 'top': return '▲';
      case 'bottom': return '▼';
      case 'both': return '◀▶';
      default: return '✂';
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
    (tile: Tile, e: Konva.KonvaEventObject<MouseEvent>) => {
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

  const getHighlightColor = () => {
    switch (highlightSource) {
      case 'step': return { fill: '#10b981', stroke: '#059669', shadow: 'rgba(16,185,129,0.5)' };
      case 'material': return { fill: '#f59e0b', stroke: '#d97706', shadow: 'rgba(245,158,11,0.5)' };
      case 'selection': return { fill: '#3b82f6', stroke: '#1d4ed8', shadow: 'rgba(59,130,246,0.5)' };
      case 'numbering': return { fill: '#8b5cf6', stroke: '#7c3aed', shadow: 'rgba(139,92,246,0.5)' };
      default: return { fill: '#10b981', stroke: '#059669', shadow: 'rgba(16,185,129,0.5)' };
    }
  };

  const getTileFill = (tile: Tile) => {
    const colors = getHighlightColor();
    if (validationResult.invalidTileIds.includes(tile.id)) return '#ef4444';
    if (tile.id === selectedTileId && selectionMode === 'single') return '#3b82f6';
    if (highlightedTileIds.has(tile.id)) return colors.fill;
    if (tile.manuallyAdjusted) return '#8b5cf6';
    if (tile.isCut) return '#f59e0b';
    return tiles.tileType === 'round' ? '#8b4513' : '#a0522d';
  };

  const getTileStroke = (tile: Tile) => {
    const colors = getHighlightColor();
    if (validationResult.invalidTileIds.includes(tile.id)) return '#b91c1c';
    if (tile.id === selectedTileId && selectionMode === 'single') return '#1d4ed8';
    if (highlightedTileIds.has(tile.id)) return colors.stroke;
    if (tile.manuallyAdjusted) return '#7c3aed';
    if (tile.isCut) return '#d97706';
    return '#5c2e0e';
  };

  const getTileStrokeWidth = (tile: Tile) => {
    if (validationResult.invalidTileIds.includes(tile.id)) return 3;
    if (tile.id === selectedTileId && selectionMode === 'single') return 2;
    if (tile.id === focusedTileId) return 3;
    if (highlightedTileIds.has(tile.id)) return 2;
    if (tile.isCut) return 2;
    return 1;
  };

  const getTileShadowColor = (tile: Tile) => {
    const colors = getHighlightColor();
    if (validationResult.invalidTileIds.includes(tile.id)) return 'rgba(239,68,68,0.5)';
    if (tile.id === focusedTileId) return colors.shadow;
    if (highlightedTileIds.has(tile.id)) return colors.shadow;
    return 'rgba(0,0,0,0.1)';
  };

  const isSelected = (tileId: string) => {
    if (selectionMode === 'single') return tileId === selectedTileId;
    return selectedTileIds.includes(tileId);
  };

  const selectionModeOptions = [
    { value: 'single', label: '单选' },
    { value: 'multi', label: '多选' },
    { value: 'box', label: '框选' },
  ];

  const boxX = Math.min(boxStart.x, boxEnd.x);
  const boxY = Math.min(boxStart.y, boxEnd.y);
  const boxWidth = Math.abs(boxEnd.x - boxStart.x);
  const boxHeight = Math.abs(boxEnd.y - boxStart.y);

  const getHighlightLabel = () => {
    switch (highlightSource) {
      case 'step': return { text: '施工步骤高亮', color: 'teal' as const };
      case 'material': return { text: '材料分组高亮', color: 'orange' as const };
      case 'selection': return { text: `已选 ${selectedTileIds.length} 块`, color: 'blue' as const };
      case 'numbering': return { text: '编号定位高亮', color: 'violet' as const };
      default: return null;
    }
  };

  const highlightLabel = getHighlightLabel();

  return (
    <Card withBorder shadow="sm" radius="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card.Section withBorder p="xs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <Tooltip label={selectionMode === 'single' ? '单选模式' : selectionMode === 'multi' ? '多选模式' : '框选模式'}>
              <SegmentedControl
                size="xs"
                value={selectionMode}
                onChange={(v) => setSelectionMode(v as SelectionMode)}
                data={selectionModeOptions}
              />
            </Tooltip>
            {selectionMode === 'multi' && selectedTileIds.length > 0 && (
              <Tooltip label="清除选择">
                <ActionIcon size="xs" variant="light" color="gray" onClick={clearTileSelection}>
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
            <Text size="xs" c="dimmed">编号</Text>
          </MantineGroup>
        </MantineGroup>
      </Card.Section>

      {highlightLabel && (
        <Card.Section p="xs" withBorder style={{ background: 'rgba(236, 253, 245, 0.5)' }}>
          <MantineGroup justify="space-between">
            <Badge size="sm" variant="light" color={highlightLabel.color}>
              {highlightLabel.text}
            </Badge>
            <Text size="xs" c="dimmed">
              {highlightSource === 'step' && `第 ${highlightedStepNumber} 步 / 共 ${constructionSequence.totalSteps} 步`}
              {highlightSource === 'material' && `共 ${highlightedMaterialGroupTileIds.length} 块瓦片`}
              {highlightSource === 'selection' && `共 ${layout.tiles.length} 块瓦片`}
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
              检测到 {validationResult.invalidTileIds.length} 块瓦片存在搭接约束违规，已用红色高亮显示。请调整相关瓦片位置或重置到原始位置。
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

      <Card.Section ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 }}>
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
              const selected = isSelected(tile.id);
              const isDraggable = selectionMode === 'single' && selected;
              return (
                <React.Fragment key={tile.id}>
                  <Rect
                    x={tile.x}
                    y={tile.y}
                    width={tile.width}
                    height={tile.height}
                    fill={getTileFill(tile)}
                    stroke={getTileStroke(tile)}
                    strokeWidth={getTileStrokeWidth(tile)}
                    draggable={isDraggable}
                    onClick={(e) => handleTileClick(tile, e)}
                    onMouseEnter={() => setFocusedTile(tile.id)}
                    onMouseLeave={() => focusedTileId === tile.id && setFocusedTile(null)}
                    onDragEnd={(e) => handleDragEnd(e, tile)}
                    shadowColor={getTileShadowColor(tile)}
                    shadowBlur={validationResult.invalidTileIds.includes(tile.id) || highlightedTileIds.has(tile.id) || tile.id === focusedTileId ? 8 : 2}
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

            {selectedTileId && selectionMode === 'single' && (
              <Rect
                x={layout.tiles.find((t) => t.id === selectedTileId)?.x ?? 0}
                y={layout.tiles.find((t) => t.id === selectedTileId)?.y ?? 0}
                width={layout.tiles.find((t) => t.id === selectedTileId)?.width ?? 0}
                height={layout.tiles.find((t) => t.id === selectedTileId)?.height ?? 0}
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
          {selectedTileIds.length > 0 && selectionMode !== 'single' && (
            <Badge size="sm" variant="light" color="blue">
              已选 {selectedTileIds.length} / {layout.tiles.length}
            </Badge>
          )}
        </MantineGroup>
      </Card.Section>
    </Card>
  );
}
