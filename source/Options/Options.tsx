import {useEffect, useState} from 'react';
import type {FC} from 'react';
import type {AIModelConfig} from '../types/storage';
import {getStorage, setStorage} from '../utils/storage';
import {Button} from '../components/Button/Button';
import {Input} from '../components/Input/Input';
import styles from './Options.module.scss';

const Options: FC = () => {
  const [saved, setSaved] = useState(false);

  // AI 模型配置状态
  const [aiProvider, setAiProvider] = useState<AIModelConfig['provider']>('openai');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModelName, setAiModelName] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [zaiServiceSite, setZaiServiceSite] = useState('https://api.z.ai/api/coding/paas/v4');
  const [zaiModelName, setZaiModelName] = useState('glm-4.6');

  useEffect(() => {
    getStorage(['aiModel']).then((result) => {
      // 加载 AI 模型配置
      if (result.aiModel) {
        setAiProvider(result.aiModel.provider);
        setAiApiKey(result.aiModel.apiKey);
        setAiModelName(result.aiModel.modelName);
        setAiBaseUrl(result.aiModel.baseUrl || '');
        setZaiServiceSite(result.aiModel.serviceSite || 'https://api.z.ai/api/coding/paas/v4');
        if (result.aiModel.provider === 'zai') {
          setZaiModelName(result.aiModel.modelName || 'glm-4.6');
        }
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
          modelName:
            aiProvider === 'zai'
              ? zaiModelName
              : aiModelName ||
                (aiProvider === 'openai'
                  ? 'gpt-4'
                  : aiProvider === 'claude'
                    ? 'claude-3-opus'
                    : 'gpt-4'),
          ...(aiBaseUrl && {baseUrl: aiBaseUrl}),
          ...(aiProvider === 'zai' && {serviceSite: zaiServiceSite}),
        }
      : null;

    await setStorage({
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
        {/* AI 模型配置部分 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>AI 模型配置</h2>
          <p className={styles.sectionHint}>
            配置 AI 模型以使用智能元素调整功能。未配置时，选择元素后将打开此设置页面。
          </p>

          {/* API 提供商 */}
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
              <option value="zai">Z.ai</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          {/* Z.ai 服务站点选择 */}
          {aiProvider === 'zai' && (
            <div className={styles.selectGroup}>
              <label htmlFor="zaiServiceSite" className={styles.label}>
                Z AI 服务站点
              </label>
              <select
                id="zaiServiceSite"
                className={styles.select}
                value={zaiServiceSite}
                onChange={(e): void => setZaiServiceSite(e.target.value)}
              >
                <option value="https://api.z.ai/api/coding/paas/v4">
                  International Coding
                </option>
                <option value="https://open.bigmodel.cn/api/coding/paas/v4">
                  China Coding
                </option>
                <option value="https://api.z.ai/api/paas/v4">International API</option>
                <option value="https://open.bigmodel.cn/api/paas/v4">China API</option>
              </select>
            </div>
          )}

          {/* Z.ai 模型选择 */}
          {aiProvider === 'zai' && (
            <div className={styles.selectGroup}>
              <label htmlFor="zaiModelName" className={styles.label}>
                模型
              </label>
              <select
                id="zaiModelName"
                className={styles.select}
                value={zaiModelName}
                onChange={(e): void => setZaiModelName(e.target.value)}
              >
                <option value="glm-4.5">glm-4.5</option>
                <option value="glm-4.5-air">glm-4.5-air</option>
                <option value="glm-4.5-x">glm-4.5-x</option>
                <option value="glm-4.5-airx">glm-4.5-airx</option>
                <option value="glm-4.5-flash">glm-4.5-flash</option>
                <option value="glm-4.5v">glm-4.5v</option>
                <option value="glm-4.6">glm-4.6</option>
                <option value="glm-4.6v">glm-4.6v</option>
                <option value="glm-4.6v-flash">glm-4.6v-flash</option>
                <option value="glm-4.7">glm-4.7</option>
                <option value="glm-4.7-flash">glm-4.7-flash</option>
                <option value="glm-5">glm-5</option>
                <option value="glm-4-32b-0414-128k">glm-4-32b-0414-128k</option>
              </select>
            </div>
          )}

          {/* API Key */}
          <Input
            label="Z AI API 密钥"
            id="apiKey"
            name="apiKey"
            type="password"
            placeholder={
              aiProvider === 'zai'
                ? '输入您的 Z AI API Key'
                : '输入您的 API Key'
            }
            spellCheck={false}
            autoComplete="off"
            value={aiApiKey}
            onChange={(e): void => setAiApiKey(e.target.value)}
          />

          {/* 非 Z.ai 提供商的模型名称输入 */}
          {aiProvider !== 'zai' && (
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
          )}

          {/* 自定义提供商的 Base URL */}
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
    </div>
  );
};

export default Options;
