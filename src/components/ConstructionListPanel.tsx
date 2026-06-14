import { Card, Group, Stack, Text, Badge, Button, Switch, TextInput, Checkbox, Divider, ActionIcon, Tooltip, ScrollArea, Modal, Box } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconPrinter, IconFileExport, IconFilter, IconRefresh, IconSearch, IconX, IconCheck, IconListNumbers, IconListCheck, IconPackages, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import type { Tile } from '@/types';

export default function ConstructionListPanel() {
  const {
    layout,
    numberingResult,
    materialStats,
    constructionSequence,
    listFilter,
    setListFilter,
    resetListFilter,
    printFilteredConstructionList,
    printConstructionList,
    focusAndHighlightTile,
    focusedTileId,
  } = useRoofStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [showStepSelector, setShowStepSelector] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const filteredTiles = useMemo(() => {
    let tiles = [...layout.tiles];

    if (!listFilter.includeFullTiles) {
      tiles = tiles.filter(t => t.isCut);
    }
    if (!listFilter.includeCutTiles) {
      tiles = tiles.filter(t => !t.isCut);
    }

    if (listFilter.selectedGroups.length > 0) {
      const groupTileIds = new Set<string>();
      materialStats.groups
        .filter(g => listFilter.selectedGroups.includes(g.groupKey))
        .forEach(g => g.tileIds.forEach(id => groupTileIds.add(id)));
      tiles = tiles.filter(t => groupTileIds.has(t.id));
    }

    if (listFilter.selectedSteps.length > 0) {
      const stepTileIds = new Set<string>();
      constructionSequence.steps
        .filter(s => listFilter.selectedSteps.includes(s.stepNumber))
        .forEach(s => s.tileIds.forEach(id => stepTileIds.add(id)));
      tiles = tiles.filter(t => stepTileIds.has(t.id));
    }

    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      tiles = tiles.filter(t => {
        const num = numberingResult.numberingMap[t.id];
        return (
          num?.displayNumber.toLowerCase().includes(kw) ||
          t.id.toLowerCase().includes(kw) ||
          String(t.row + 1).includes(kw) ||
          String(t.col + 1).includes(kw)
        );
      });
    }

    return tiles;
  }, [layout.tiles, listFilter, materialStats.groups, constructionSequence.steps, numberingResult.numberingMap, searchKeyword]);

  const hasActiveFilter = useMemo(() => {
    return (
      !listFilter.includeFullTiles ||
      !listFilter.includeCutTiles ||
      listFilter.selectedGroups.length > 0 ||
      listFilter.selectedSteps.length > 0 ||
      searchKeyword.trim() !== ''
    );
  }, [listFilter, searchKeyword]);

  const filteredGroups = useMemo(() => {
    if (listFilter.selectedGroups.length > 0) {
      return materialStats.groups.filter(g => listFilter.selectedGroups.includes(g.groupKey));
    }
    const tileIdSet = new Set(filteredTiles.map(t => t.id));
    return materialStats.groups
      .map(g => ({
        ...g,
        count: g.tileIds.filter(id => tileIdSet.has(id)).length,
        tileIds: g.tileIds.filter(id => tileIdSet.has(id)),
        totalArea: g.tileIds.filter(id => tileIdSet.has(id)).reduce((sum, id) => {
          const tile = layout.tiles.find(t => t.id === id);
          return sum + (tile ? tile.width * tile.height : 0);
        }, 0),
      }))
      .filter(g => g.count > 0);
  }, [materialStats.groups, filteredTiles, listFilter.selectedGroups, layout.tiles]);

  const filteredSteps = useMemo(() => {
    if (listFilter.selectedSteps.length > 0) {
      return constructionSequence.steps.filter(s => listFilter.selectedSteps.includes(s.stepNumber));
    }
    const tileIdSet = new Set(filteredTiles.map(t => t.id));
    return constructionSequence.steps
      .map(s => ({
        ...s,
        tileIds: s.tileIds.filter(id => tileIdSet.has(id)),
      }))
      .filter(s => s.tileIds.length > 0);
  }, [constructionSequence.steps, filteredTiles, listFilter.selectedSteps]);

  const filteredTotalArea = filteredTiles.reduce((sum, t) => sum + t.width * t.height, 0);

  const toggleGroup = (groupKey: string) => {
    const isSelected = listFilter.selectedGroups.includes(groupKey);
    const newGroups = isSelected
      ? listFilter.selectedGroups.filter(g => g !== groupKey)
      : [...listFilter.selectedGroups, groupKey];
    setListFilter({ selectedGroups: newGroups });
  };

  const toggleStep = (stepNumber: number) => {
    const isSelected = listFilter.selectedSteps.includes(stepNumber);
    const newSteps = isSelected
      ? listFilter.selectedSteps.filter(s => s !== stepNumber)
      : [...listFilter.selectedSteps, stepNumber];
    setListFilter({ selectedSteps: newSteps });
  };

  const selectAllGroups = () => {
    setListFilter({ selectedGroups: materialStats.groups.map(g => g.groupKey) });
  };

  const clearGroupFilter = () => {
    setListFilter({ selectedGroups: [] });
  };

  const selectAllSteps = () => {
    setListFilter({ selectedSteps: constructionSequence.steps.map(s => s.stepNumber) });
  };

  const clearStepFilter = () => {
    setListFilter({ selectedSteps: [] });
  };

  const handleTileClick = (tile: Tile) => {
    focusAndHighlightTile(tile.id);
  };

  const allGroupsSelected = listFilter.selectedGroups.length === materialStats.groups.length;
  const allStepsSelected = listFilter.selectedSteps.length === constructionSequence.totalSteps;

  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder p="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconPrinter size={20} stroke={1.5} />
            <Text fw={600} size="lg">施工清单</Text>
          </Group>
          <Badge variant="light" color="blue">
            {filteredTiles.length} 块
          </Badge>
        </Group>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="sm">
          <TextInput
            size="xs"
            placeholder="搜索编号/行列/ID..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            leftSection={<IconSearch size={14} />}
            rightSection={
              searchKeyword ? (
                <ActionIcon size="xs" variant="transparent" onClick={() => setSearchKeyword('')}>
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
          />

          <Group gap="xs">
            <Switch
              size="xs"
              checked={listFilter.includeFullTiles}
              onChange={(e) => setListFilter({ includeFullTiles: e.currentTarget.checked })}
              label={
                <Text size="xs" c="green">
                  完整瓦
                </Text>
              }
            />
            <Switch
              size="xs"
              checked={listFilter.includeCutTiles}
              onChange={(e) => setListFilter({ includeCutTiles: e.currentTarget.checked })}
              label={
                <Text size="xs" c="orange">
                  裁切瓦
                </Text>
              }
            />
          </Group>

          <Divider />

          <Group justify="space-between">
            <Group gap="xs">
              <IconPackages size={14} color="#f59e0b" />
              <Text size="xs" fw={500}>
                材料分组筛选
              </Text>
              {listFilter.selectedGroups.length > 0 && (
                <Badge size="xs" variant="light" color="orange">
                  {listFilter.selectedGroups.length}/{materialStats.groups.length}
                </Badge>
              )}
            </Group>
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={() => setShowGroupSelector(!showGroupSelector)}
            >
              {showGroupSelector ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </ActionIcon>
          </Group>

          {showGroupSelector && (
            <Box
              style={{
                padding: 8,
                background: '#fffbeb',
                borderRadius: 6,
                border: '1px solid #fde68a',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Checkbox
                  size="xs"
                  checked={allGroupsSelected}
                  onChange={() => allGroupsSelected ? clearGroupFilter() : selectAllGroups()}
                  label={<Text size="11px">全选</Text>}
                />
                {listFilter.selectedGroups.length > 0 && (
                  <Tooltip label="清除">
                    <ActionIcon size="xs" variant="light" color="gray" onClick={clearGroupFilter}>
                      <IconX size={12} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <ScrollArea h={100} type="hover">
                <Stack gap="xs">
                  {materialStats.groups.map((group) => (
                    <Checkbox
                      key={group.groupKey}
                      size="xs"
                      checked={listFilter.selectedGroups.includes(group.groupKey)}
                      onChange={() => toggleGroup(group.groupKey)}
                      label={
                        <Text size="11px">
                          {group.groupName} ({group.count}块)
                        </Text>
                      }
                    />
                  ))}
                </Stack>
              </ScrollArea>
            </Box>
          )}

          <Group justify="space-between">
            <Group gap="xs">
              <IconListCheck size={14} color="#10b981" />
              <Text size="xs" fw={500}>
                施工步骤筛选
              </Text>
              {listFilter.selectedSteps.length > 0 && (
                <Badge size="xs" variant="light" color="teal">
                  {listFilter.selectedSteps.length}/{constructionSequence.totalSteps}
                </Badge>
              )}
            </Group>
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={() => setShowStepSelector(!showStepSelector)}
            >
              {showStepSelector ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </ActionIcon>
          </Group>

          {showStepSelector && (
            <Box
              style={{
                padding: 8,
                background: '#ecfdf5',
                borderRadius: 6,
                border: '1px solid #6ee7b7',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Checkbox
                  size="xs"
                  checked={allStepsSelected}
                  onChange={() => allStepsSelected ? clearStepFilter() : selectAllSteps()}
                  label={<Text size="11px">全选</Text>}
                />
                {listFilter.selectedSteps.length > 0 && (
                  <Tooltip label="清除">
                    <ActionIcon size="xs" variant="light" color="gray" onClick={clearStepFilter}>
                      <IconX size={12} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <ScrollArea h={100} type="hover">
                <Stack gap="xs">
                  {constructionSequence.steps.map((step) => (
                    <Checkbox
                      key={step.stepNumber}
                      size="xs"
                      checked={listFilter.selectedSteps.includes(step.stepNumber)}
                      onChange={() => toggleStep(step.stepNumber)}
                      label={
                        <Text size="11px">
                          第{step.stepNumber}步 ({step.tileIds.length}块)
                        </Text>
                      }
                    />
                  ))}
                </Stack>
              </ScrollArea>
            </Box>
          )}
        </Stack>
      </Card.Section>

      <Card.Section p="md" withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">筛选结果</Text>
            {hasActiveFilter && (
              <Badge size="xs" variant="light" color="blue">
                已筛选
              </Badge>
            )}
          </Group>
          <Group grow>
            <div>
              <Text size="10px" c="dimmed">瓦片数</Text>
              <Text fw={700} size="md">
                {filteredTiles.length}
              </Text>
            </div>
            <div>
              <Text size="10px" c="dimmed">材料组数</Text>
              <Text fw={700} size="md">
                {filteredGroups.length}
              </Text>
            </div>
            <div>
              <Text size="10px" c="dimmed">施工步数</Text>
              <Text fw={700} size="md">
                {filteredSteps.length}
              </Text>
            </div>
          </Group>
          <Group justify="space-between">
            <Text size="10px" c="dimmed">总面积</Text>
            <Text size="sm" fw={600}>
              {(filteredTotalArea / 1000000).toFixed(4)} m²
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="10px" c="dimmed">占总数比</Text>
            <Text size="sm" fw={600}>
              {layout.tiles.length > 0 ? ((filteredTiles.length / layout.tiles.length) * 100).toFixed(1) : 0}%
            </Text>
          </Group>
        </Stack>
      </Card.Section>

      <Card.Section p="md">
        <Stack gap="sm">
          <Group grow>
            <Button
              size="sm"
              leftSection={<IconPrinter size={14} />}
              variant="filled"
              color="blue"
              onClick={() => (hasActiveFilter ? printFilteredConstructionList() : printConstructionList())}
            >
              {hasActiveFilter ? '打印筛选清单' : '打印完整清单'}
            </Button>
            <Button
              size="sm"
              leftSection={<IconFileExport size={14} />}
              variant="light"
              color="blue"
              onClick={() => setShowPreview(true)}
            >
              预览明细
            </Button>
          </Group>
          {hasActiveFilter && (
            <Button
              size="sm"
              variant="subtle"
              color="gray"
              leftSection={<IconRefresh size={14} />}
              onClick={resetListFilter}
            >
              重置筛选条件
            </Button>
          )}
        </Stack>
      </Card.Section>

      <Modal
        opened={showPreview}
        onClose={() => setShowPreview(false)}
        title={`施工清单预览（${filteredTiles.length} 块）`}
        size="lg"
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Badge variant="light" color="blue">
              共 {filteredTiles.length} 块瓦片
            </Badge>
            <Button
              size="xs"
              leftSection={<IconPrinter size={14} />}
              onClick={() => {
                setShowPreview(false);
                setTimeout(() => (hasActiveFilter ? printFilteredConstructionList() : printConstructionList()), 100);
              }}
            >
              打印
            </Button>
          </Group>

          <Divider />

          <Text size="sm" fw={500}>瓦片明细</Text>
          <ScrollArea h={300} type="hover">
            <Stack gap="xs">
              {filteredTiles.map((tile) => {
                const num = numberingResult.numberingMap[tile.id];
                const isFocused = focusedTileId === tile.id;
                return (
                  <Group
                    key={tile.id}
                    justify="space-between"
                    style={{
                      padding: '6px 10px',
                      background: isFocused ? '#dbeafe' : '#f8fafc',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: `1px solid ${isFocused ? '#3b82f6' : '#e2e8f0'}`,
                    }}
                    onClick={() => handleTileClick(tile)}
                  >
                    <Group gap="xs">
                      <Badge size="sm" variant="light" color={tile.isCut ? 'orange' : 'green'}>
                        {tile.isCut ? '裁切' : '完整'}
                      </Badge>
                      <Text size="sm" fw={600} c="blue">
                        {num?.displayNumber || tile.id}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="11px" c="dimmed">
                        R{tile.row + 1} C{tile.col + 1}
                      </Text>
                      <Text size="11px" c="dimmed">
                        {tile.width.toFixed(0)}×{tile.height.toFixed(0)}mm
                      </Text>
                    </Group>
                  </Group>
                );
              })}
              {filteredTiles.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  没有匹配的瓦片
                </Text>
              )}
            </Stack>
          </ScrollArea>

          <Text size="xs" c="dimmed" ta="center">
            点击瓦片可在画布上定位高亮
          </Text>
        </Stack>
      </Modal>
    </Card>
  );
}
