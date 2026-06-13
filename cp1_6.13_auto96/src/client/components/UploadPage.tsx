import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Save } from 'lucide-react';
import FileUpload from './FileUpload';
import TagInput from './TagInput';
import { assetApi } from '@/api/client';
import { useStore } from '@/store/useStore';
import { CATEGORIES } from '@shared/types';
import type { CreateAssetDto } from '@shared/types';

export default function UploadPage() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'model' as const,
    price: '0',
    tags: [] as string[],
  });
  
  const [modelUrl, setModelUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData((prev) => ({ ...prev, tags }));
  };

  const handleUploadComplete = (url: string) => {
    setModelUrl(url);
    showToast('文件上传成功', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast('请输入素材名称', 'error');
      return;
    }
    
    if (!modelUrl) {
      showToast('请上传模型文件', 'error');
      return;
    }
    
    if (formData.tags.length === 0) {
      showToast('请至少添加一个标签', 'error');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const dto: CreateAssetDto = {
        name: formData.name,
        description: formData.description || '暂无描述',
        category: formData.category,
        tags: formData.tags,
        price: parseFloat(formData.price) || 0,
        modelUrl,
        thumbnailUrl: 'https://picsum.photos/seed/' + Date.now() + '/400/300',
        author: 'Current Seller',
      };
      
      await assetApi.createAsset(dto);
      showToast('素材发布成功', 'success');
      navigate('/manage');
    } catch (error) {
      showToast('发布失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/manage')}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              上传素材
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              发布你的3D模型、纹理或音效素材
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />
              模型文件
            </h2>
            
            <FileUpload
              onUpload={assetApi.uploadModel}
              onUploadComplete={handleUploadComplete}
              maxSizeMB={15}
              acceptedTypes={['.glb']}
              label="3D模型文件"
              description="支持 .glb 格式，最大 15MB"
            />
          </div>

          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-5">
            <h2 className="text-lg font-semibold text-white">基本信息</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                素材名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="输入素材名称"
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                素材描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="详细描述你的素材特点、使用方式等"
                rows={4}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">
                {formData.description.length}/500
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  素材分类 <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  价格 (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                标签 <span className="text-red-400">*</span>
                <span className="text-slate-500 font-normal ml-2">最多5个，输入后回车添加</span>
              </label>
              <TagInput
                value={formData.tags}
                onChange={handleTagsChange}
                maxTags={5}
                placeholder="输入标签，支持自动补全..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/manage')}
              className="px-6 py-2.5 text-slate-300 hover:text-white transition-colors duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 active:scale-[0.98]"
            >
              <Save className="w-5 h-5" />
              {submitting ? '发布中...' : '发布素材'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
