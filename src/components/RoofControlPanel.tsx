import { Card, Group, NumberInput, Select, Stack, Text } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { validateRoofParams } from '@/utils/roofCalculator';
import { IconHome } from '@tabler/icons-react';
import { type RoofShape } from '@/types';

export default function RoofControlPanel() {
  const { roof, setRoof } = useRoofStore();
  const errors = validateRoofParams(roof);
  const hasErrors = errors.length > 0;

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group gap="sm">
          <IconHome size={20} stroke={1.5} />
          <Text fw={600} size="lg">屋面参数</Text>
        </Group>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="md">
          <Select
            label="屋面形状"
            value={roof.shape}
            onChange={(value) => setRoof({ shape: value as RoofShape })}
            data={[
              { value: 'rectangle', label: '矩形' },
              { value: 'trapezoid', label: '梯形' },
              { value: 'curved', label: '曲面' },
            ]}
          />

          <Group grow>
            <NumberInput
              label="屋面宽度 (mm)"
              value={roof.width}
              onChange={(value) => setRoof({ width: Number(value) || 0 })}
              min={1}
              error={hasErrors && roof.width <= 0}
            />
            <NumberInput
              label="屋面高度 (mm)"
              value={roof.height}
              onChange={(value) => setRoof({ height: Number(value) || 0 })}
              min={1}
              error={hasErrors && roof.height <= 0}
            />
          </Group>

          {roof.shape === 'trapezoid' && (
            <NumberInput
              label="屋面顶宽 (mm)"
              value={roof.topWidth}
              onChange={(value) => setRoof({ topWidth: Number(value) || 0 })}
              min={1}
              description="梯形屋面顶部的宽度"
            />
          )}

          {roof.shape === 'curved' && (
            <NumberInput
              label="起拱高度 (mm)"
              value={roof.curveDepth}
              onChange={(value) => setRoof({ curveDepth: Number(value) || 0 })}
              min={0}
              description="曲面屋面中部的凸起高度"
            />
          )}

          {hasErrors && (
            <Text size="sm" c="red">
              {errors.join('；')}
            </Text>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
}
