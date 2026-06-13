import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, ImagePlus, DollarSign, FileText, Type, CheckCircle2 } from 'lucide-react';
import { createProject, createUser } from '@/api/projectApi';
import { useAppStore } from '@/store/useAppStore';
import { validateFile, fileToBase64 } from '@/utils/helpers';

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const { addToast, currentUser, setCurrentUser } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState<number>(1000);
  const [creatorName, setCreatorName] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const titleLimit = 50;
  const descLimit = 500;
  const minGoal = 100;
  const maxGoal = 10000;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setImageError(validation.error || '图片验证失败');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setCoverImage(base64);
      setCoverFile(file);
    } catch {
      setImageError('图片处理失败，请重试');
    }
  };

  const removeImage = () => {
    setCoverImage('');
    setCoverFile(null);
    setImageError('');
  };

  const isFormValid = (): boolean => {
    if (!title.trim() || title.length > titleLimit) return false;
    if (!description.trim() || description.length > descLimit) return false;
    if (goalAmount < minGoal || goalAmount > maxGoal) return false;
    if (!creatorName.trim() && !currentUser) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      addToast('请检查表单填写是否正确', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let user = currentUser;
      if (!user && creatorName.trim()) {
        user = await createUser({ name: creatorName.trim() });
        setCurrentUser(user);
      }

      if (!user) {
        addToast('请填写发起人名称', 'error');
        return;
      }

      const newProject = await createProject({
        title: title.trim(),
        description: description.trim(),
        goalAmount,
        creatorId: user.id,
        coverImage,
      });

      addToast('项目创建成功！🎉');
      navigate(`/project/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      addToast('创建项目失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1f2937] mb-2">发起新项目</h1>
        <p className="text-[#4b5563]">填写以下信息，开启你的众筹之旅</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <label className="block text-base font-semibold text-[#1f2937] mb-4 flex items-center gap-2">
            <Type className="w-5 h-5 text-[#3b82f6]" />
            项目标题
          </label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, titleLimit))}
              placeholder="给你的项目起一个响亮的名字"
              className="w-full h-12 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent text-base"
              maxLength={titleLimit}
            />
            <div
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${
                title.length >= titleLimit ? 'text-red-500' : 'text-[#64748b]'
              }`}
            >
              {title.length}/{titleLimit}
            </div>
          </div>
          {title.length >= titleLimit && (
            <p className="mt-2 text-sm text-red-500">标题已达到最大长度</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <label className="block text-base font-semibold text-[#1f2937] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#3b82f6]" />
            详细描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, descLimit))}
            placeholder="详细介绍你的项目：它是什么？为什么重要？支持者能获得什么？"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent text-base"
            rows={6}
            maxLength={descLimit}
          />
          <div className="flex justify-between mt-2">
            <div className="text-sm text-[#64748b]">
              建议包含：项目背景、执行计划、使用方向、回报承诺
            </div>
            <div
              className={`text-sm ${
                description.length >= descLimit ? 'text-red-500' : 'text-[#64748b]'
              }`}
            >
              {description.length}/{descLimit}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <label className="block text-base font-semibold text-[#1f2937] mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#3b82f6]" />
            目标金额
          </label>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-[#1f2937]">¥</span>
              <input
                type="number"
                value={goalAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val <= maxGoal) setGoalAmount(val);
                }}
                min={minGoal}
                max={maxGoal}
                step={100}
                className="flex-1 h-12 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent text-2xl font-semibold"
              />
            </div>
            <input
              type="range"
              min={minGoal}
              max={maxGoal}
              step={100}
              value={goalAmount}
              onChange={(e) => setGoalAmount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6366f1]"
            />
            <div className="flex justify-between text-sm text-[#64748b]">
              <span>¥{minGoal.toLocaleString()}</span>
              <span className="font-medium text-[#3b82f6]">
                当前: ¥{goalAmount.toLocaleString()}
              </span>
              <span>¥{maxGoal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <label className="block text-base font-semibold text-[#1f2937] mb-4 flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-[#3b82f6]" />
            封面图片
          </label>

          {!coverImage ? (
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-[#3b82f6] hover:bg-blue-50/50 transition-all cursor-pointer group">
                <Upload className="w-12 h-12 mx-auto text-[#94a3b8] group-hover:text-[#3b82f6] transition-colors mb-4" />
                <p className="text-[#1f2937] font-medium mb-2">点击上传封面图片</p>
                <p className="text-sm text-[#64748b]">支持 JPG、PNG 格式，最大 2MB</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-start gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 shadow-md border-4 border-white">
                  <img
                    src={coverImage}
                    alt="封面预览"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 pt-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">图片上传成功</span>
                </div>
                {coverFile && (
                  <p className="text-sm text-[#64748b]">
                    {coverFile.name} ({(coverFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          )}

          {imageError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {imageError}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <label className="block text-base font-semibold text-[#1f2937] mb-4">
            发起人信息
          </label>
          {currentUser ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-[#1f2937]">{currentUser.name}</p>
                <p className="text-sm text-[#64748b]">已登录为发起人</p>
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="请输入发起人昵称"
              className="w-full h-12 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent text-base"
              maxLength={20}
            />
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 h-10 bg-white border border-gray-200 text-[#4b5563] rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!isFormValid() || submitting}
            className={`flex-1 h-10 rounded-lg font-semibold transition-colors ${
              !isFormValid() || submitting
                ? 'bg-[#94a3b8] cursor-not-allowed text-white'
                : 'bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white'
            }`}
          >
            {submitting ? '创建中...' : '发起众筹'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProjectPage;
