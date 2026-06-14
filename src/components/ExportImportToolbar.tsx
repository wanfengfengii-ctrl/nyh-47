import { useRef, useState } from 'react';
import { Group, Button, Tooltip, Alert, Modal, Stack, Text, Badge, Menu } from '@mantine/core';
import { useRoofStore } from '@/store/roofStore';
import { IconDownload, IconUpload, IconFileExport, IconAlertTriangle, IconCircleCheck, IconPrinter, IconFileText, IconChevronDown } from '@tabler/icons-react';
import type { ProjectData } from '@/types';

export default function ExportImportToolbar() {
  const { exportProject, importProject, importValidationResult, clearImportValidation, exportConstructionListHTML, printConstructionList, exportConstructionListJSON } = useRoofStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleExportConstructionListJSON = () => {
    const data = exportConstructionListJSON();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `施工清单_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          const result = importProject(data);
          setImportSuccess(result.success);
          setImportWarnings(result.warnings);
          setImportModalOpen(true);
        } else {
          alert('文件格式错误，请导入有效的方案文件');
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

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    clearImportValidation();
  };

  return (
    <>
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

      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <Button
            leftSection={<IconFileExport size={18} />}
            rightSection={<IconChevronDown size={14} />}
            variant="light"
            color="teal"
            size="sm"
          >
            施工清单
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>导出施工清单</Menu.Label>
          <Menu.Item
            leftSection={<IconPrinter size={16} />}
            onClick={printConstructionList}
          >
            打印施工清单
          </Menu.Item>
          <Menu.Item
            leftSection={<IconFileText size={16} />}
            onClick={exportConstructionListHTML}
          >
            导出 HTML (可打印)
          </Menu.Item>
          <Menu.Item
            leftSection={<IconDownload size={16} />}
            onClick={handleExportConstructionListJSON}
          >
            导出 JSON 数据
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

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

      <Modal
        opened={importModalOpen}
        onClose={handleCloseImportModal}
        title={importSuccess ? "方案导入成功" : "方案导入失败"}
        centered
      >
        <Stack gap="md">
          <Group gap="xs">
            {importSuccess ? (
              <IconCircleCheck size={24} color="green" />
            ) : (
              <IconAlertTriangle size={24} color="red" />
            )}
            <Text fw={600}>
              {importSuccess ? "已完成自动重算与校验" : "导入过程出现问题"}
            </Text>
          </Group>

          {importValidationResult && (
            <Alert
              icon={importValidationResult.isValid ? <IconCircleCheck size={16} /> : <IconAlertTriangle size={16} />}
              title="搭接约束校验"
              color={importValidationResult.isValid ? 'green' : 'red'}
              variant="light"
            >
              <Stack gap="xs">
                <Text size="sm">
                  {importValidationResult.isValid 
                    ? "所有瓦片排布符合约束要求" 
                    : `检测到 ${importValidationResult.invalidTileIds.length} 块瓦片存在搭接约束违规`}
                </Text>
                {!importValidationResult.isValid && (
                  <Text size="xs" c="dimmed">
                    违规瓦片已用红色高亮显示，请检查并调整。
                  </Text>
                )}
              </Stack>
            </Alert>
          )}

          {importWarnings.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>导入提示：</Text>
              {importWarnings.map((warning, idx) => (
                <Group key={idx} gap="xs">
                  <Badge size="sm" color="orange" variant="light">
                    警告
                  </Badge>
                  <Text size="sm">{warning}</Text>
                </Group>
              ))}
            </Stack>
          )}

          <Button
            onClick={handleCloseImportModal}
            variant="filled"
            fullWidth
            mt="md"
          >
            确定
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
