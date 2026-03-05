import {useEffect, useState} from 'react';
import type {FC} from 'react';
import type {AIModelConfig} from '../types/storage';
import {getStorage, setStorage} from '../utils/storage';
import {Button} from '../components/Button/Button';
import {Input} from '../components/Input/Input';
import {Checkbox} from '../components/Checkbox/Checkbox';
import {GitHubIcon} from '../components/icons/GitHubIcon';
import styles from './Options.module.scss';

const Options: FC = () => {
  const [username, setUsername] = useState('');
  const [enableLogging, setEnableLogging] = useState(false);
  const [saved, setSaved] = useState(false);

  // AI 模型配置状态
  const [aiProvider, setAiProvider] = useState<AIModelConfig['provider']>('openai');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModelName, setAiModelName] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');

  useEffect(() => {
    getStorage(['username', 'enableLogging', 'aiModel']).then((result) => {
      setUsername(result.username);
      setEnableLogging(result.enableLogging);

      // 加载 AI 模型配置
      if (result.aiModel) {
        setAiProvider(result.aiModel.provider);
        setAiApiKey(result.aiModel.apiKey);
        setAiModelName(result.aiModel.modelName);
        setAiBaseUrl(result.aiModel.baseUrl || '');
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // 构建 AI 模型配置对象
    const aiModel: AIModelConfig | null = aiApiKey
      ? {
          provider: aiProvider,
          apiKey: aiApiKey,
          modelName: aiModelName || (aiProvider === 'openai' ? 'gpt-4' : 'claude-3-opus'),
          ...(aiBaseUrl && {baseUrl: aiBaseUrl}),
        }
      : null;

    await setStorage({
      username,
      enableLogging,
      aiModel,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={styles.options}>
      <header className={styles.header}>
        <h1>PickBetter 设置</h1>
        <p>配置扩展程序偏好设置</p>
      </header>

      <form onSubmit={handleSave} className={styles.form}>
        {/* 基本设置部分 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>基本设置</h2>

          <Input
            label="用户名"
            id="username"
            name="username"
            placeholder="输入您的名称"
            spellCheck={false}
            autoComplete="off"
            value={username}
            onChange={(e): void => setUsername(e.target.value)}
          />

          <Checkbox
            id="logging"
            name="logging"
            label="在控制台显示每个页面启用的功能"
            checked={enableLogging}
            onChange={(e): void => setEnableLogging(e.target.checked)}
          />
        </div>

        {/* AI 模型配置部分 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>AI 模型配置</h2>
          <p className={styles.sectionHint}>
            配置 AI 模型以使用智能元素调整功能。未配置时，选择元素后将打开此设置页面。
          </p>

          <div className={styles.selectGroup}>
            <label htmlFor="aiProvider" className={styles.label}>
              AI 提供商
            </label>
            <select
              id="aiProvider"
              className={styles.select}
              value={aiProvider}
              onChange={(e): void =>
                setAiProvider(e.target.value as AIModelConfig['provider'])
              }
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <Input
            label="API Key"
            id="apiKey"
            name="apiKey"
            type="password"
            placeholder="输入您的 API Key"
            spellCheck={false}
            autoComplete="off"
            value={aiApiKey}
            onChange={(e): void => setAiApiKey(e.target.value)}
          />

          <Input
            label="模型名称"
            id="modelName"
            name="modelName"
            placeholder={
              aiProvider === 'openai'
                ? '例如: gpt-4, gpt-3.5-turbo'
                : aiProvider === 'claude'
                  ? '例如: claude-3-opus-20240229'
                  : '自定义模型名称'
            }
            spellCheck={false}
            autoComplete="off"
            value={aiModelName}
            onChange={(e): void => setAiModelName(e.target.value)}
          />

          {aiProvider === 'custom' && (
            <Input
              label="Base URL"
              id="baseUrl"
              name="baseUrl"
              placeholder="例如: https://api.example.com/v1"
              spellCheck={false}
              autoComplete="off"
              value={aiBaseUrl}
              onChange={(e): void => setAiBaseUrl(e.target.value)}
            />
          )}
        </div>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" size="large">
            保存设置
          </Button>
          {saved && <span className={styles.status}>设置已保存</span>}
        </div>
      </form>

      <footer className={styles.footer}>
        <a
          href="https://github.com/eagune/PickBetter"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          <GitHubIcon size={18} />
          <span>在 GitHub 上查看</span>
        </a>
      </footer>
    </div>
  );
};

export default Options;
