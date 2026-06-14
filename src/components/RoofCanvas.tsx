import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Text as KonvaText } from 'react-konva';
import { Card, Group as MantineGroup, Text, ActionIcon, Tooltip, Alert, Switch } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { getRoofBoundaryPoints, isPointInRoof, validateSingleTileAdjustment } from '@/utils/roofCalculator';
import type { Tile } from '@/types';
import { IconZoomIn, IconZoomOut, IconZoomCancel, IconAlertTriangle, IconListNumbers, IconEye, IconEyeOff } from '@tabler/icons-react';
import Konva from 'konva';

const STAGE_PADDING = 40;
const SCALE_STEP = 0.1;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

export default function RoofCanvas() {
  const { roof, layout, selectedTileId, setSelectedTile, setManualAdjustment, tiles, validationResult, lastValidationMessage, showTileNumbers, toggleShowTileNumbers, numberingResult, highlightedStepNumber, constructionSequence, highlightedMaterialGroupTileIds } = useRoofStore();
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [stageSize, setStageSize] = useState({ width: 600, height: 500 });
  const [offset, setOffset] = useState({ x: STAGE_PADDING, y: STAGE_PADDING });
  const [dragErrorMessage, setDragErrorMessage] = useState<string>('');

  const boundaryPoints = getRoofBoundaryPoints(roof);
  const boundaryFlatPoints = boundaryPoints.flatMap((p) => [p.x, p.y]);

  const highlightedTileIds = useMemo(() => {
    const ids = new Set<string>();
    if (highlightedStepNumber !== null) {
      const step = constructionSequence.steps.find(s => s.stepNumber === highlightedStepNumber);
      if (step) step.tileIds.forEach(id => ids.add(id));
    }
    highlightedMaterialGroupTileIds.forEach(id => ids.add(id));
    return ids;
  }, [highlightedStepNumber, constructionSequence.steps, highlightedMaterialGroupTileIds]);

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
    (tile: Tile) => {
      setSelectedTile(tile.id);
    },
    [setSelectedTile]
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, tile: Tile) => {
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
    [roof, setManualAdjustment, layout.tiles, tiles]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        setSelectedTile(null);
      }
    },
    [setSelectedTile]
  );

  const getTileFill = (tile: Tile) => {
    if (validationResult.invalidTileIds.includes(tile.id)) return '#ef4444';
    if (tile.id === selectedTileId) return '#3b82f6';
    if (highlightedTileIds.has(tile.id)) return '#10b981';
    if (tile.manuallyAdjusted) return '#8b5cf6';
    if (tile.isCut) return '#f59e0b';
    return tiles.tileType === 'round' ? '#8b4513' : '#a0522d';
  };

  const getTileStroke = (tile: Tile) => {
    if (validationResult.invalidTileIds.includes(tile.id)) return '#b91c1c';
    if (tile.id === selectedTileId) return '#1d4ed8';
    if (highlightedTileIds.has(tile.id)) return '#059669';
    if (tile.manuallyAdjusted) return '#7c3aed';
    if (tile.isCut) return '#d97706';
    return '#5c2e0e';
  };

  const getTileStrokeWidth = (tile: Tile) => {
    if (validationResult.invalidTileIds.includes(tile.id)) return 3;
    if (tile.id === selectedTileId) return 2;
    if (highlightedTileIds.has(tile.id)) return 3;
    if (tile.isCut) return 2;
    return 1;
  };

  const getTileShadowColor = (tile: Tile) => {
    if (validationResult.invalidTileIds.includes(tile.id)) return 'rgba(239,68,68,0.5)';
    if (highlightedTileIds.has(tile.id)) return 'rgba(16,185,129,0.5)';
    return 'rgba(0,0,0,0.1)';
  };

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
          <Text size="sm" c="dimmed">
            点击瓦片可选中，拖拽可调整位置
          </Text>
        </MantineGroup>
      </Card.Section>

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
          onClick={handleStageClick}
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
                    draggable
                    onClick={() => handleTileClick(tile)}
                    onDragEnd={(e) => handleDragEnd(e, tile)}
                    shadowColor={getTileShadowColor(tile)}
                    shadowBlur={validationResult.invalidTileIds.includes(tile.id) || highlightedTileIds.has(tile.id) ? 8 : 2}
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
                        />
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })}

            {selectedTileId && (
              <Rect
                x={layout.tiles.find((t) => t.id === selectedTileId)?.x ?? 0}
                y={layout.tiles.find((t) => t.id === selectedTileId)?.y ?? 0}
                width={layout.tiles.find((t) => t.id === selectedTileId)?.width ?? 0}
                height={layout.tiles.find((t) => t.id === selectedTileId)?.height ?? 0}
                stroke="#3b82f6"
                strokeWidth={3}
                dash={[5, 5]}
              />
            )}
          </Layer>
        </Stage>
      </Card.Section>
    </Card>
  );
}
