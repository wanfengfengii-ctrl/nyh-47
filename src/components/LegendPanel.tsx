import { Card, Group, Stack, Text, Box } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconInfoCircle } from '@tabler/icons-react';

export default function LegendPanel() {
  const { tiles } = useRoofStore();
  const baseColor = tiles.tileType === 'round' ? '#8b4513' : '#a0522d';

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group gap="sm">
          <IconInfoCircle size={20} stroke={1.5} />
          <Text fw={600} size="lg">图例</Text>
        </Group>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="sm">
          <Group gap="sm">
            <Box
              w={24}
              h={16}
              style={{
                backgroundColor: baseColor,
                border: '1px solid #5c2e0e',
                borderRadius: 2,
              }}
            />
            <Text size="sm">完整瓦</Text>
          </Group>
          <Group gap="sm">
            <Box
              w={24}
              h={16}
              style={{
                backgroundColor: '#f59e0b',
                border: '1px solid #5c2e0e',
                borderRadius: 2,
              }}
            />
            <Text size="sm">裁切瓦</Text>
          </Group>
          <Group gap="sm">
            <Box
              w={24}
              h={16}
              style={{
                backgroundColor: '#8b5cf6',
                border: '1px solid #7c3aed',
                borderRadius: 2,
              }}
            />
            <Text size="sm">已手动调整</Text>
          </Group>
          <Group gap="sm">
            <Box
              w={24}
              h={16}
              style={{
                backgroundColor: '#3b82f6',
                border: '2px solid #1d4ed8',
                borderRadius: 2,
              }}
            />
            <Text size="sm">选中瓦片</Text>
          </Group>
          <Group gap="sm">
            <Box
              w={24}
              h={16}
              style={{
                backgroundColor: '#e2e8f0',
                border: '2px solid #64748b',
                borderRadius: 2,
              }}
            />
            <Text size="sm">屋面区域</Text>
          </Group>
        </Stack>
      </Card.Section>
    </Card>
  );
}
