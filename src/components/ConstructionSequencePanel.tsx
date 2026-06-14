import { Card, Group, Stack, Text, Badge, Select, ActionIcon, Tooltip, ScrollArea, Checkbox, Divider, Box } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconListCheck, IconArrowUp, IconArrowDown, IconArrowLeft, IconArrowRight, IconFocus, IconFocusCentered, IconEye, IconEyeOff, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { ConstructionDirection } from '@/types';
import { useState, useMemo } from 'react';

export default function ConstructionSequencePanel() {
  const {
    constructionSequence,
    constructionDirection,
    setConstructionDirection,
    highlightedStepNumber,
    setHighlightedStepNumber,
    numberingResult,
    listFilter,
    setListFilter,
  } = useRoofStore();

  const [expandedStep, setExpandedStep] = useState<number | null>(null);

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

  const handleStepClick = (stepNumber: number) => {
    const isHighlighted = highlightedStepNumber === stepNumber;
    setHighlightedStepNumber(isHighlighted ? null : stepNumber);
    if (!isHighlighted) {
      setExpandedStep(stepNumber === expandedStep ? null : stepNumber);
    }
  };

  const isStepInFilter = (stepNumber: number) => {
    return listFilter.selectedSteps.includes(stepNumber);
  };

  const toggleStepFilter = (stepNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSelected = listFilter.selectedSteps.includes(stepNumber);
    const newSteps = isSelected
      ? listFilter.selectedSteps.filter(s => s !== stepNumber)
      : [...listFilter.selectedSteps, stepNumber];
    setListFilter({ selectedSteps: newSteps });
  };

  const selectAllSteps = () => {
    const allSteps = constructionSequence.steps.map(s => s.stepNumber);
    setListFilter({ selectedSteps: allSteps });
  };

  const clearStepFilter = () => {
    setListFilter({ selectedSteps: [] });
  };

  const allStepsSelected = useMemo(() => {
    return listFilter.selectedSteps.length === constructionSequence.totalSteps;
  }, [listFilter.selectedSteps.length, constructionSequence.totalSteps]);

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

          <Divider />

          <Group justify="space-between">
            <Group gap="xs">
              <Checkbox
                size="xs"
                checked={allStepsSelected}
                onChange={() => allStepsSelected ? clearStepFilter() : selectAllSteps()}
                label={
                  <Text size="xs" fw={500}>
                    筛选施工步骤
                  </Text>
                }
              />
            </Group>
            {listFilter.selectedSteps.length > 0 && (
              <Tooltip label="清除筛选">
                <ActionIcon size="xs" variant="light" color="gray" onClick={clearStepFilter}>
                  <IconEyeOff size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          {listFilter.selectedSteps.length > 0 && (
            <Badge size="sm" variant="light" color="blue">
              已选 {listFilter.selectedSteps.length} 步用于清单筛选
            </Badge>
          )}
        </Stack>
      </Card.Section>

      <Card.Section p={0}>
        <ScrollArea h={320} type="hover">
          <Stack gap="xs" p="md">
            {constructionSequence.steps.map((step) => {
              const isHighlighted = highlightedStepNumber === step.stepNumber;
              const isExpanded = expandedStep === step.stepNumber;
              const isFiltered = isStepInFilter(step.stepNumber);
              const sampleTileId = step.tileIds[0];
              const sampleNumbering = sampleTileId ? numberingResult.numberingMap[sampleTileId] : null;
              const lastTileId = step.tileIds[step.tileIds.length - 1];
              const lastNumbering = lastTileId ? numberingResult.numberingMap[lastTileId] : null;

              return (
                <div key={step.stepNumber}>
                  <Group
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${isHighlighted ? '#10b981' : isFiltered ? '#3b82f6' : '#e5e7eb'}`,
                      background: isHighlighted ? '#ecfdf5' : isFiltered ? '#eff6ff' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={() => handleStepHover(step.stepNumber)}
                    onMouseLeave={() => highlightedStepNumber === step.stepNumber && handleStepHover(null)}
                    onClick={() => handleStepClick(step.stepNumber)}
                    justify="space-between"
                  >
                    <Group gap="sm">
                      <Checkbox
                        size="sm"
                        checked={isFiltered}
                        onClick={(e) => toggleStepFilter(step.stepNumber, e as unknown as React.MouseEvent)}
                        readOnly
                      />
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
                            {sampleNumbering.displayNumber} → {lastNumbering?.displayNumber || ''}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                    <Stack gap={0} align="flex-end">
                      <Group gap="xs">
                        <Badge size="sm" variant="light" color="gray">
                          {step.tileIds.length} 块
                        </Badge>
                        <ActionIcon size="xs" variant="subtle" color="gray">
                          {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                        </ActionIcon>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {(step.estimatedArea / 1000000).toFixed(4)} m²
                      </Text>
                    </Stack>
                  </Group>

                  {isExpanded && step.tileIds.length > 0 && (
                    <Box
                      style={{
                        marginLeft: 42,
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderLeft: '2px solid #10b981',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #e2e8f0',
                        borderBottomLeftRadius: 8,
                        borderBottomRightRadius: 8,
                        marginTop: -4,
                      }}
                    >
                      <Text size="11px" fw={500} c="dimmed" mb={6}>
                        本步瓦片编号（{step.tileIds.length} 块）：
                      </Text>
                      <Group gap="xs">
                        {step.tileIds.slice(0, 12).map((tileId) => {
                          const num = numberingResult.numberingMap[tileId];
                          return (
                            <Badge
                              key={tileId}
                              size="sm"
                              variant="light"
                              color="teal"
                              style={{ fontFamily: 'monospace', fontSize: 10 }}
                            >
                              {num?.displayNumber || tileId}
                            </Badge>
                          );
                        })}
                        {step.tileIds.length > 12 && (
                          <Text size="10px" c="dimmed">
                            +{step.tileIds.length - 12} 块
                          </Text>
                        )}
                      </Group>
                    </Box>
                  )}
                </div>
              );
            })}
          </Stack>
        </ScrollArea>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {highlightedStepNumber !== null
              ? `第 ${highlightedStepNumber} 步已高亮，再次点击可取消`
              : '鼠标悬停/点击可预览对应瓦片'}
          </Text>
          <IconFocus size={14} color="#6b7280" />
        </Group>
      </Card.Section>
    </Card>
  );
}
