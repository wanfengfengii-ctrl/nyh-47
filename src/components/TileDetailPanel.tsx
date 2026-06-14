import { Card, Group, Stack, Text, NumberInput, Badge, Button, Alert } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconSquare, IconRefresh, IconAlertTriangle, IconHome } from '@tabler/icons-react';
import { useState, useCallback, useEffect } from 'react';

export default function TileDetailPanel() {
  const { roof, layout, selectedTileId, setManualAdjustment, manualAdjustments, clearManualAdjustment, resetTileToOriginal, originalPositions, validationResult, tiles, lastValidationMessage } = useRoofStore();
  const [inputErrorMessage, setInputErrorMessage] = useState('');

  const selectedTile = layout.tiles.find((t) => t.id === selectedTileId);

  useEffect(() => {
    if (!selectedTileId) {
      setInputErrorMessage('');
    }
  }, [selectedTileId]);

  if (!selectedTile) {
    return (
      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder p="md">
          <Group gap="sm">
            <IconSquare size={20} stroke={1.5} />
            <Text fw={600} size="lg">瓦片详情</Text>
          </Group>
        </Card.Section>
        <Card.Section p="md">
          <Text size="sm" c="dimmed" ta="center">
            请在画布上选择一块瓦片查看详情
          </Text>
        </Card.Section>
      </Card>
    );
  }

  const adjustment = manualAdjustments[selectedTile.id];
  const originalPos = originalPositions[selectedTile.id];
  const displayX = adjustment?.x ?? selectedTile.x;
  const displayY = adjustment?.y ?? selectedTile.y;
  const hasViolation = validationResult.invalidTileIds.includes(selectedTile.id);
  const tileViolations = validationResult.violations.filter(v => v.tileId === selectedTile.id);

  const maxX = Math.max(0, roof.width - selectedTile.width);
  const maxY = Math.max(0, roof.height - selectedTile.height);

  const showTempError = useCallback((msg: string) => {
    setInputErrorMessage(msg);
    setTimeout(() => {
      setInputErrorMessage('');
    }, 3000);
  }, []);

  const handleXChange = useCallback((value: number | string) => {
    const num = Number(value) || 0;
    const result = setManualAdjustment(selectedTile.id, num, displayY);
    if (!result.success) {
      showTempError(result.message);
    } else {
      setInputErrorMessage('');
    }
  }, [selectedTile.id, displayY, setManualAdjustment, showTempError]);

  const handleYChange = useCallback((value: number | string) => {
    const num = Number(value) || 0;
    const result = setManualAdjustment(selectedTile.id, displayX, num);
    if (!result.success) {
      showTempError(result.message);
    } else {
      setInputErrorMessage('');
    }
  }, [selectedTile.id, displayX, setManualAdjustment, showTempError]);

  const handleReset = () => {
    clearManualAdjustment(selectedTile.id);
    setInputErrorMessage('');
  };

  const handleResetToOriginal = () => {
    resetTileToOriginal(selectedTile.id);
    setInputErrorMessage('');
  };

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <IconSquare size={20} stroke={1.5} />
            <Text fw={600} size="lg">瓦片详情</Text>
          </Group>
          <Badge variant="light" color={selectedTile.isCut ? 'orange' : 'green'}>
            {selectedTile.isCut ? '裁切瓦' : '完整瓦'}
          </Badge>
        </Group>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="md">
          {hasViolation && (
            <Alert
              icon={<IconAlertTriangle size={16} />}
              title="搭接约束违规"
              color="red"
              variant="light"
            >
              <Stack gap="xs">
                {tileViolations.slice(0, 2).map((v, idx) => (
                  <Text size="xs" key={idx}>
                    {v.type === 'horizontal' ? '横向' : '纵向'}搭接不足（{v.direction === 'left' ? '左侧' : v.direction === 'right' ? '右侧' : v.direction === 'top' ? '上方' : '下方'}）：实际 {v.actualOverlap.toFixed(1)}mm，最小要求 {v.requiredOverlap}mm
                  </Text>
                ))}
                {tileViolations.length > 2 && (
                  <Text size="xs" c="dimmed">
                    还有 {tileViolations.length - 2} 项违规...
                  </Text>
                )}
              </Stack>
            </Alert>
          )}

          <Group grow>
            <div>
              <Text size="sm" c="dimmed">瓦片编号</Text>
              <Text fw={600}>{selectedTile.id}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">行列</Text>
              <Text fw={600}>第{selectedTile.row}行 第{selectedTile.col}列</Text>
            </div>
          </Group>

          <Group grow>
            <div>
              <Text size="sm" c="dimmed">宽度 (mm)</Text>
              <Text fw={600}>{selectedTile.width.toFixed(1)}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">长度 (mm)</Text>
              <Text fw={600}>{selectedTile.height.toFixed(1)}</Text>
            </div>
          </Group>

          {selectedTile.isCut && selectedTile.originalWidth && selectedTile.originalHeight && (
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">原始宽度</Text>
                <Text fw={600} c="orange">
                  {selectedTile.originalWidth.toFixed(1)} mm
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">原始长度</Text>
                <Text fw={600} c="orange">
                  {selectedTile.originalHeight.toFixed(1)} mm
                </Text>
              </div>
            </Group>
          )}

          {originalPos && (
            <Group grow>
              <div>
                <Text size="sm" c="dimmed">原始 X 坐标</Text>
                <Text fw={600} c="blue">
                  {originalPos.x.toFixed(1)} mm
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">原始 Y 坐标</Text>
                <Text fw={600} c="blue">
                  {originalPos.y.toFixed(1)} mm
                </Text>
              </div>
            </Group>
          )}

          <Text size="sm" fw={500} mt="xs">位置调整</Text>

          {inputErrorMessage && (
            <Alert
              icon={<IconAlertTriangle size={16} />}
              title="调整被拦截"
              color="orange"
              variant="light"
            >
              <Text size="sm">{inputErrorMessage}</Text>
            </Alert>
          )}

          <Group grow>
            <NumberInput
              label="X 坐标 (mm)"
              description={`允许范围: 0 ~ ${Math.round(maxX)}`}
              value={Math.round(displayX)}
              onChange={handleXChange}
              min={0}
              max={maxX}
              size="sm"
              error={hasViolation || !!inputErrorMessage}
            />
            <NumberInput
              label="Y 坐标 (mm)"
              description={`允许范围: 0 ~ ${Math.round(maxY)}`}
              value={Math.round(displayY)}
              onChange={handleYChange}
              min={0}
              max={maxY}
              size="sm"
              error={hasViolation || !!inputErrorMessage}
            />
          </Group>

          <Group grow>
            {selectedTile.manuallyAdjusted && (
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                color="gray"
                size="sm"
                onClick={handleReset}
              >
                清除调整标记
              </Button>
            )}
            <Button
              leftSection={<IconHome size={16} />}
              variant="filled"
              color="blue"
              size="sm"
              onClick={handleResetToOriginal}
            >
              重置到原始位置
            </Button>
          </Group>

          <Text size="xs" c="dimmed">
            最小搭接要求：横向 {tiles.minOverlapX}mm，纵向 {tiles.minOverlapY}mm
          </Text>
        </Stack>
      </Card.Section>
    </Card>
  );
}
