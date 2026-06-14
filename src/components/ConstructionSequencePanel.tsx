import { Card, Group, Stack, Text, Badge, Select, ActionIcon, Tooltip, ScrollArea } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconListCheck, IconArrowUp, IconArrowDown, IconArrowLeft, IconArrowRight, IconFocus, IconFocusCentered } from '@tabler/icons-react';
import type { ConstructionDirection } from '@/types';

export default function ConstructionSequencePanel() {
  const {
    constructionSequence,
    constructionDirection,
    setConstructionDirection,
    highlightedStepNumber,
    setHighlightedStepNumber,
    numberingResult,
  } = useRoofStore();

  const directionOptions = [
    { value: 'bottom-up', label: '从下往上' },
    { value: 'top-down', label: '从上往下' },
    { value: 'left-right', label: '从左往右' },
    { value: 'right-left', label: '从右往左' },
  ];

  const getDirectionIcon = (dir: ConstructionDirection) => {
    switch (dir) {
      case 'bottom-up': return <IconArrowUp size={16} />;
      case 'top-down': return <IconArrowDown size={16} />;
      case 'left-right': return <IconArrowRight size={16} />;
      case 'right-left': return <IconArrowLeft size={16} />;
      default: return <IconArrowUp size={16} />;
    }
  };

  const handleStepHover = (stepNumber: number | null) => {
    setHighlightedStepNumber(stepNumber);
  };

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconListCheck size={20} stroke={1.5} />
            <Text fw={600} size="lg">施工顺序</Text>
          </Group>
          <Badge variant="light" color="teal">
            共 {constructionSequence.totalSteps} 步
          </Badge>
        </Group>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" fw={500}>施工方向</Text>
            <Group gap="xs">
              {getDirectionIcon(constructionDirection)}
              <Select
                size="xs"
                w={130}
                value={constructionDirection}
                onChange={(v) => v && setConstructionDirection(v as ConstructionDirection)}
                data={directionOptions}
                allowDeselect={false}
              />
            </Group>
          </Group>
          {highlightedStepNumber !== null && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">当前高亮步骤</Text>
              <Tooltip label="清除高亮">
                <ActionIcon
                  size="xs"
                  variant="light"
                  color="gray"
                  onClick={() => handleStepHover(null)}
                >
                  <IconFocusCentered size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Stack>
      </Card.Section>

      <Card.Section p={0}>
        <ScrollArea h={300} type="hover">
          <Stack gap="xs" p="md">
            {constructionSequence.steps.map((step) => {
              const isHighlighted = highlightedStepNumber === step.stepNumber;
              const sampleTileId = step.tileIds[0];
              const sampleNumbering = sampleTileId ? numberingResult.numberingMap[sampleTileId] : null;
              return (
                <Group
                  key={step.stepNumber}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isHighlighted ? '#10b981' : '#e5e7eb'}`,
                    background: isHighlighted ? '#ecfdf5' : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={() => handleStepHover(step.stepNumber)}
                  onMouseLeave={() => highlightedStepNumber === step.stepNumber && handleStepHover(null)}
                  onClick={() => handleStepHover(isHighlighted ? null : step.stepNumber)}
                  justify="space-between"
                >
                  <Group gap="sm">
                    <Badge
                      size="lg"
                      variant={isHighlighted ? 'filled' : 'light'}
                      color={isHighlighted ? 'teal' : 'blue'}
                      style={{ minWidth: 42, justifyContent: 'center' }}
                    >
                      {step.stepNumber}
                    </Badge>
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>
                        {step.description}
                      </Text>
                      {sampleNumbering && step.tileIds.length > 1 && (
                        <Text size="xs" c="dimmed">
                          起始编号：{sampleNumbering.displayNumber}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                  <Stack gap={0} align="flex-end">
                    <Badge size="sm" variant="light" color="gray">
                      {step.tileIds.length} 块
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {(step.estimatedArea / 1000000).toFixed(4)} m²
                    </Text>
                  </Stack>
                </Group>
              );
            })}
          </Stack>
        </ScrollArea>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            鼠标悬停可预览对应瓦片
          </Text>
          <IconFocus size={14} color="#6b7280" />
        </Group>
      </Card.Section>
    </Card>
  );
}
