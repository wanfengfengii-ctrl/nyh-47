import { Card, Group, Stack, Text, NumberInput, Badge, Button } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconSquare, IconRefresh } from '@tabler/icons-react';

export default function TileDetailPanel() {
  const { layout, selectedTileId, setManualAdjustment, manualAdjustments } = useRoofStore();

  const selectedTile = layout.tiles.find((t) => t.id === selectedTileId);

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
  const displayX = adjustment?.x ?? selectedTile.x;
  const displayY = adjustment?.y ?? selectedTile.y;

  const handleXChange = (value: number | string) => {
    const num = Number(value) || 0;
    setManualAdjustment(selectedTile.id, num, displayY);
  };

  const handleYChange = (value: number | string) => {
    const num = Number(value) || 0;
    setManualAdjustment(selectedTile.id, displayX, num);
  };

  const handleReset = () => {
    const newAdjustments = { ...manualAdjustments };
    delete newAdjustments[selectedTile.id];
    setManualAdjustment(selectedTile.id, selectedTile.x, selectedTile.y);
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

          <Text size="sm" fw={500} mt="xs">位置调整</Text>

          <Group grow>
            <NumberInput
              label="X 坐标 (mm)"
              value={Math.round(displayX)}
              onChange={handleXChange}
              min={0}
              size="sm"
            />
            <NumberInput
              label="Y 坐标 (mm)"
              value={Math.round(displayY)}
              onChange={handleYChange}
              min={0}
              size="sm"
            />
          </Group>

          {selectedTile.manuallyAdjusted && (
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              color="gray"
              size="sm"
              onClick={handleReset}
            >
              重置此瓦片位置
            </Button>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
}
