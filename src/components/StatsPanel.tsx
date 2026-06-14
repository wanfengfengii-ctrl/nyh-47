import { Card, Group, Stack, Text, Progress, Badge, Alert, NumberInput } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconChartBar, IconAlertTriangle, IconTrash } from '@tabler/icons-react';

export default function StatsPanel() {
  const { layout, wasteThreshold, showWasteWarning, setWasteThreshold, clearManualAdjustments, manualAdjustments } = useRoofStore();

  const wastePercent = (layout.wasteRate * 100).toFixed(2);
  const thresholdPercent = (wasteThreshold * 100).toFixed(0);
  const adjustedCount = Object.keys(manualAdjustments).length;

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group gap="sm">
          <IconChartBar size={20} stroke={1.5} />
          <Text fw={600} size="lg">排布统计</Text>
        </Group>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="md">
          <Group grow>
            <div>
              <Text size="sm" c="dimmed">完整瓦数量</Text>
              <Text fw={700} size="xl" c="green">
                {layout.fullTileCount}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">裁切瓦数量</Text>
              <Text fw={700} size="xl" c="orange">
                {layout.cutTileCount}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">总瓦片数</Text>
              <Text fw={700} size="xl">
                {layout.totalTileCount}
              </Text>
            </div>
          </Group>

          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>损耗率</Text>
              <Badge color={showWasteWarning ? 'red' : 'green'} variant="filled">
                {wastePercent}%
              </Badge>
            </Group>
            <Progress
              value={parseFloat(wastePercent)}
              color={showWasteWarning ? 'red' : 'green'}
              size="lg"
              striped
              animated={showWasteWarning}
            />
            <Text size="xs" c="dimmed" mt="xs">
              阈值: {thresholdPercent}%
            </Text>
          </div>

          <NumberInput
            label="损耗率阈值 (%)"
            value={wasteThreshold * 100}
            onChange={(value) => setWasteThreshold((Number(value) || 0) / 100)}
            min={0}
            max={100}
            description="超过此值将显示警告"
          />

          {showWasteWarning && (
            <Alert
              icon={<IconAlertTriangle size={16} />}
              title="损耗率过高"
              color="red"
              variant="light"
            >
              当前损耗率为 {wastePercent}%，超过 {thresholdPercent}% 的阈值。建议调整瓦片尺寸或搭接距离以降低损耗。
            </Alert>
          )}

          <Group grow>
            <div>
              <Text size="sm" c="dimmed">屋面面积</Text>
              <Text fw={600}>{(layout.roofArea / 1000000).toFixed(4)} m²</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">瓦片总面积</Text>
              <Text fw={600}>{(layout.totalTileArea / 1000000).toFixed(4)} m²</Text>
            </div>
          </Group>

          {adjustedCount > 0 && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                已调整瓦片: {adjustedCount} 块
              </Text>
              <Badge
                variant="light"
                color="blue"
                leftSection={<IconTrash size={12} />}
                style={{ cursor: 'pointer' }}
                onClick={clearManualAdjustments}
              >
                重置调整
              </Badge>
            </Group>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
}
