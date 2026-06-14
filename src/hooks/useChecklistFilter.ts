import { useMemo } from 'react';
import { useRoofStore } from '@/store/roofStore';
import { applyChecklistFilter } from '@/domains/checklist';
import type { ConstructionListFilter } from '@/types';

export interface UseChecklistFilterResult {
  filter: ConstructionListFilter;
  setFilter: (patch: Partial<ConstructionListFilter>) => void;
  resetFilter: () => void;

  filteredTiles: ReturnType<typeof applyChecklistFilter>['filteredTiles'];
  filteredGroups: ReturnType<typeof applyChecklistFilter>['filteredGroups'];
  filteredSteps: ReturnType<typeof applyChecklistFilter>['filteredSteps'];
  hasActiveFilter: boolean;

  filteredTotalCount: number;
  filteredTotalArea: number;
  filteredPercentage: number;

  toggleGroupInFilter: (groupKey: string) => void;
  toggleStepInFilter: (stepNumber: number) => void;
  selectAllGroups: () => void;
  clearGroupFilter: () => void;
  selectAllSteps: () => void;
  clearStepFilter: () => void;
  allGroupsSelected: boolean;
  allStepsSelected: boolean;
}

export function useChecklistFilter(localKeyword?: string): UseChecklistFilterResult {
  const filter = useRoofStore((s) => s.listFilter);
  const setFilter = useRoofStore((s) => s.setListFilter);
  const resetFilter = useRoofStore((s) => s.resetListFilter);

  const layout = useRoofStore((s) => s.layout);
  const materialStats = useRoofStore((s) => s.materialStats);
  const constructionSequence = useRoofStore((s) => s.constructionSequence);
  const numberingResult = useRoofStore((s) => s.numberingResult);

  const effectiveFilter = useMemo<ConstructionListFilter>(() => {
    if (localKeyword !== undefined) {
      return { ...filter, searchKeyword: localKeyword };
    }
    return filter;
  }, [filter, localKeyword]);

  const result = useMemo(() => {
    return applyChecklistFilter(
      {
        tiles: layout.tiles,
        groups: materialStats.groups,
        steps: constructionSequence.steps,
        numberingMap: numberingResult.numberingMap,
      },
      effectiveFilter
    );
  }, [
    layout.tiles,
    materialStats.groups,
    constructionSequence.steps,
    numberingResult.numberingMap,
    effectiveFilter,
  ]);

  const filteredTotalCount = result.filteredTiles.length;
  const filteredTotalArea = useMemo(
    () => result.filteredTiles.reduce((sum, t) => sum + t.width * t.height, 0),
    [result.filteredTiles]
  );
  const filteredPercentage = useMemo(() => {
    const total = layout.tiles.length;
    return total > 0 ? (filteredTotalCount / total) * 100 : 0;
  }, [filteredTotalCount, layout.tiles.length]);

  const toggleGroupInFilter = (groupKey: string) => {
    const isSelected = filter.selectedGroups.includes(groupKey);
    const newGroups = isSelected
      ? filter.selectedGroups.filter((g) => g !== groupKey)
      : [...filter.selectedGroups, groupKey];
    setFilter({ selectedGroups: newGroups });
  };

  const toggleStepInFilter = (stepNumber: number) => {
    const isSelected = filter.selectedSteps.includes(stepNumber);
    const newSteps = isSelected
      ? filter.selectedSteps.filter((s) => s !== stepNumber)
      : [...filter.selectedSteps, stepNumber];
    setFilter({ selectedSteps: newSteps });
  };

  const selectAllGroups = () => {
    setFilter({ selectedGroups: materialStats.groups.map((g) => g.groupKey) });
  };

  const clearGroupFilter = () => {
    setFilter({ selectedGroups: [] });
  };

  const selectAllSteps = () => {
    setFilter({ selectedSteps: constructionSequence.steps.map((s) => s.stepNumber) });
  };

  const clearStepFilter = () => {
    setFilter({ selectedSteps: [] });
  };

  const allGroupsSelected = filter.selectedGroups.length === materialStats.groups.length;
  const allStepsSelected = filter.selectedSteps.length === constructionSequence.totalSteps;

  return {
    filter,
    setFilter,
    resetFilter,
    filteredTiles: result.filteredTiles,
    filteredGroups: result.filteredGroups,
    filteredSteps: result.filteredSteps,
    hasActiveFilter: result.hasActiveFilter,
    filteredTotalCount,
    filteredTotalArea,
    filteredPercentage,
    toggleGroupInFilter,
    toggleStepInFilter,
    selectAllGroups,
    clearGroupFilter,
    selectAllSteps,
    clearStepFilter,
    allGroupsSelected,
    allStepsSelected,
  };
}
