import { useRef } from 'react';
import { Group, Button, Tooltip } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconDownload, IconUpload, IconFileExport } from '@tabler/icons-react';
import type { ProjectData } from '@/types';

export default function ExportImportToolbar() {
  const { exportProject, importProject } = useRoofStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportProject();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `屋面排布方案_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ProjectData;
        if (data.roof && data.tiles) {
          importProject(data);
        }
      } catch {
        alert('文件格式错误，请导入有效的方案文件');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Group gap="xs">
      <Tooltip label="导出方案 (保留人工调整)">
        <Button
          leftSection={<IconDownload size={18} />}
          onClick={handleExport}
          variant="filled"
          size="sm"
        >
          导出方案
        </Button>
      </Tooltip>
      <Tooltip label="导入方案">
        <Button
          leftSection={<IconUpload size={18} />}
          onClick={handleImportClick}
          variant="light"
          size="sm"
        >
          导入方案
        </Button>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Group>
  );
}
