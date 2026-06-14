import { Card, Group, Stack, Text, Badge, ScrollArea, Progress, Divider, Box, Checkbox, ActionIcon, Tooltip } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconPackages, IconScissors, IconSquare, IconEye, IconEyeOff, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useState } from 'react';

export default function MaterialStatsPanel() {
  const {
    materialStats,
    setSelectedTile,
    layout,
    highlightedMaterialGroupTileIds,
    setHighlightedMaterialGroupTileIds,
    clearHighlightedMaterialGroup,
    listFilter,
    setListFilter,
    numberingResult,
  } = useRoofStore();

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const handleGroupClick = (groupKey: string, tileIds: string[]) => {
    const isAlreadyHighlighted = tileIds.length > 0 && highlightedMaterialGroupTileIds.length > 0 &&
      tileIds.every(id => highlightedMaterialGroupTileIds.includes(id));

    if (isAlreadyHighlighted) {
      clearHighlightedMaterialGroup();
    } else {
      setHighlightedMaterialGroupTileIds(tileIds);
      if (tileIds.length > 0) {
        setSelectedTile(tileIds[0]);
      }
    }
    setExpandedGroup(groupKey === expandedGroup ? null : groupKey);
  };

  const isGroupHighlighted = (tileIds: string[]) => {
    if (tileIds.length === 0 || highlightedMaterialGroupTileIds.length === 0) return false;
    return tileIds.every(id => highlightedMaterialGroupTileIds.includes(id));
  };

  const isGroupInFilter = (groupKey: string) => {
    return listFilter.selectedGroups.includes(groupKey);
  };

  const toggleGroupFilter = (groupKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSelected = listFilter.selectedGroups.includes(groupKey);
    const newGroups = isSelected
      ? listFilter.selectedGroups.filter(g => g !== groupKey)
      : [...listFilter.selectedGroups, groupKey];
    setListFilter({ selectedGroups: newGroups });
  };

  const selectAllGroups = () => {
    const allKeys = materialStats.groups.map(g => g.groupKey);
    setListFilter({ selectedGroups: allKeys });
  };

  const clearGroupFilter = () => {
    setListFilter({ selectedGroups: [] });
  };

  const allGroupsSelected = listFilter.selectedGroups.length === materialStats.groups.length;

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconPackages size={20} stroke={1.5} />
            <Text fw={600} size="lg">材料分组统计</Text>
          </Group>
          <Badge variant="light" color="blue">
            {materialStats.summary.totalGroups} 组
          </Badge>
        </Group>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="sm">
          <Group grow>
            <div>
              <Text size="sm" c="dimmed">完整瓦组数</Text>
              <Group gap="xs" mt="xs">
                <IconSquare size={16} color="#22c55e" />
                <Text fw={700} c="green" size="xl">
                  {materialStats.fullTileGroups.length}
                </Text>
              </Group>
            </div>
            <div>
              <Text size="sm" c="dimmed">裁切瓦组数</Text>
              <Group gap="xs" mt="xs">
                <IconScissors size={16} color="#f59e0b" />
                <Text fw={700} c="orange" size="xl">
                  {materialStats.cutTileGroups.length}
                </Text>
              </Group>
            </div>
          </Group>

          <Divider />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">材料总面积</Text>
            <Text fw={600}>
              {(materialStats.summary.totalArea / 1000000).toFixed(4)} m²
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">屋面面积</Text>
            <Text fw={600}>
              {(layout.roofArea / 1000000).toFixed(4)} m²
            </Text>
          </Group>

          <Divider />

          <Group justify="space-between">
            <Group gap="xs">
              <Checkbox
                size="xs"
                checked={allGroupsSelected}
                onChange={() => allGroupsSelected ? clearGroupFilter() : selectAllGroups()}
                label={
                  <Text size="xs" fw={500}>
                    筛选材料分组
                  </Text>
                }
              />
            </Group>
            {listFilter.selectedGroups.length > 0 && (
              <Tooltip label="清除筛选">
                <ActionIcon size="xs" variant="light" color="gray" onClick={clearGroupFilter}>
                  <IconEyeOff size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          {listFilter.selectedGroups.length > 0 && (
            <Badge size="sm" variant="light" color="orange">
              已选 {listFilter.selectedGroups.length} 组用于清单筛选
            </Badge>
          )}
        </Stack>
      </Card.Section>

      <Card.Section p={0}>
        <ScrollArea h={280} type="hover">
          <Stack gap="xs" p="md">
            <Text size="xs" fw={600} c="green" tt="uppercase">
              ■ 完整瓦
            </Text>
            {materialStats.fullTileGroups.map((group) => {
              const percentage = (group.count / materialStats.summary.totalTileCount) * 100;
              const highlighted = isGroupHighlighted(group.tileIds);
              const isFiltered = isGroupInFilter(group.groupKey);
              const isExpanded = expandedGroup === group.groupKey;

              return (
                <div key={group.groupKey}>
                  <Box
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `2px solid ${highlighted ? '#10b981' : isFiltered ? '#3b82f6' : '#dcfce7'}`,
                      background: highlighted ? '#d1fae5' : isFiltered ? '#eff6ff' : '#f0fdf4',
                      cursor: 'pointer',
                      boxShadow: highlighted ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => handleGroupClick(group.groupKey, group.tileIds)}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Checkbox
                          size="sm"
                          checked={isFiltered}
                          onClick={(e) => toggleGroupFilter(group.groupKey, e as unknown as React.MouseEvent)}
                          readOnly
                        />
                        {highlighted && <IconEye size={14} color="#059669" />}
                        <Text size="sm" fw={500}>
                          {group.groupName}
                        </Text>
                      </Group>
                      <Group gap="xs">
                        <ActionIcon size="xs" variant="subtle" color="gray">
                          {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                        </ActionIcon>
                        <Badge size="sm" variant="filled" color="green">
                          {group.count} 块
                        </Badge>
                      </Group>
                    </Group>
                    <Progress value={percentage} size="sm" color={highlighted ? 'teal' : 'green'} mb="xs" />
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        占比 {percentage.toFixed(1)}%
                      </Text>
                      <Text size="xs" c="dimmed">
                        {(group.totalArea / 1000000).toFixed(4)} m²
                      </Text>
                    </Group>
                  </Box>

                  {isExpanded && group.tileIds.length > 0 && (
                    <Box
                      style={{
                        marginLeft: 28,
                        padding: '8px 12px',
                        background: '#f0fdf4',
                        borderLeft: '2px solid #10b981',
                        borderRight: '1px solid #dcfce7',
                        borderBottom: '1px solid #dcfce7',
                        borderBottomLeftRadius: 8,
                        borderBottomRightRadius: 8,
                        marginTop: -2,
                      }}
                    >
                      <Text size="11px" fw={500} c="dimmed" mb={6}>
                        本组瓦片编号（{group.tileIds.length} 块）：
                      </Text>
                      <Group gap="xs">
                        {group.tileIds.slice(0, 10).map((tileId) => {
                          const num = numberingResult.numberingMap[tileId];
                          return (
                            <Badge
                              key={tileId}
                              size="sm"
                              variant="light"
                              color="green"
                              style={{ fontFamily: 'monospace', fontSize: 10 }}
                            >
                              {num?.displayNumber || tileId}
                            </Badge>
                          );
                        })}
                        {group.tileIds.length > 10 && (
                          <Text size="10px" c="dimmed">
                            +{group.tileIds.length - 10} 块
                          </Text>
                        )}
                      </Group>
                    </Box>
                  )}
                </div>
              );
            })}

            {materialStats.cutTileGroups.length > 0 && (
              <>
                <Divider mt="md" />
                <Text size="xs" fw={600} c="orange" tt="uppercase" mt="xs">
                  ■ 裁切瓦
                </Text>
                {materialStats.cutTileGroups.map((group) => {
                  const percentage = (group.count / materialStats.summary.totalTileCount) * 100;
                  const highlighted = isGroupHighlighted(group.tileIds);
                  const isFiltered = isGroupInFilter(group.groupKey);
                  const isExpanded = expandedGroup === group.groupKey;

                  return (
                    <div key={group.groupKey}>
                      <Box
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `2px solid ${highlighted ? '#10b981' : isFiltered ? '#3b82f6' : '#fef3c7'}`,
                          background: highlighted ? '#d1fae5' : isFiltered ? '#eff6ff' : '#fffbeb',
                          cursor: 'pointer',
                          boxShadow: highlighted ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => handleGroupClick(group.groupKey, group.tileIds)}
                      >
                        <Group justify="space-between" mb="xs">
                          <Group gap="xs">
                            <Checkbox
                              size="sm"
                              checked={isFiltered}
                              onClick={(e) => toggleGroupFilter(group.groupKey, e as unknown as React.MouseEvent)}
                              readOnly
                            />
                            {highlighted ? <IconEye size={14} color="#059669" /> : <IconScissors size={14} color="#f59e0b" />}
                            <Text size="sm" fw={500}>
                              {group.groupName}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <ActionIcon size="xs" variant="subtle" color="gray">
                              {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                            </ActionIcon>
                            <Badge size="sm" variant="filled" color="orange">
                              {group.count} 块
                            </Badge>
                          </Group>
                        </Group>
                        <Progress value={percentage} size="sm" color={highlighted ? 'green' : 'orange'} mb="xs" />
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            占比 {percentage.toFixed(1)}%
                          </Text>
                          <Text size="xs" c="dimmed">
                            {(group.totalArea / 1000000).toFixed(4)} m²
                          </Text>
                        </Group>
                      </Box>

                      {isExpanded && group.tileIds.length > 0 && (
                        <Box
                          style={{
                            marginLeft: 28,
                            padding: '8px 12px',
                            background: '#fffbeb',
                            borderLeft: '2px solid #10b981',
                            borderRight: '1px solid #fef3c7',
                            borderBottom: '1px solid #fef3c7',
                            borderBottomLeftRadius: 8,
                            borderBottomRightRadius: 8,
                            marginTop: -2,
                          }}
                        >
                          <Text size="11px" fw={500} c="dimmed" mb={6}>
                            本组瓦片编号（{group.tileIds.length} 块）：
                          </Text>
                          <Group gap="xs">
                            {group.tileIds.slice(0, 10).map((tileId) => {
                              const num = numberingResult.numberingMap[tileId];
                              return (
                                <Badge
                                  key={tileId}
                                  size="sm"
                                  variant="light"
                                  color="orange"
                                  style={{ fontFamily: 'monospace', fontSize: 10 }}
                                >
                                  {num?.displayNumber || tileId}
                                </Badge>
                              );
                            })}
                            {group.tileIds.length > 10 && (
                              <Text size="10px" c="dimmed">
                                +{group.tileIds.length - 10} 块
                              </Text>
                            )}
                          </Group>
                        </Box>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </Stack>
        </ScrollArea>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {highlightedMaterialGroupTileIds.length > 0
              ? `已高亮 ${highlightedMaterialGroupTileIds.length} 块瓦片，再次点击可取消`
              : '点击分组可高亮整组瓦片'}
          </Text>
          {highlightedMaterialGroupTileIds.length > 0 && (
            <Badge
              size="sm"
              variant="light"
              color="gray"
              style={{ cursor: 'pointer' }}
              onClick={clearHighlightedMaterialGroup}
            >
              <Group gap="xs">
                <IconEyeOff size={12} />
                清除高亮
              </Group>
            </Badge>
          )}
        </Group>
      </Card.Section>
    </Card>
  );
}
