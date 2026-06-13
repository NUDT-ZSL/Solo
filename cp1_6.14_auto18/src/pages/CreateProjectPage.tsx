import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, AlertCircle } from 'lucide-react';
import { createProject, createUser } from '@/api/projectApi';
import { useAppStore } from '@/store/useAppStore';
import { validateFile, fileToBase64, getAvatarColor, getInitials } from '@/utils/helpers';

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const { addToast, currentUser, setCurrentUser } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState<number>(1000);
  const [creatorName, setCreatorName] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCreatorName(currentUser.name);
    }
  }, [currentUser]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '请输入项目标题';
    } else if (title.length > 50) {
      newErrors.title = '标题不能超过50字';
    }

    if (!description.trim()) {
      newErrors.description = '请输入项目描述';
    } else if (description.length > 500) {
      newErrors.description = '描述不能超过500字';
    }

    if (!goalAmount || goalAmount < 100) {
      newErrors.goalAmount = '目标金额至少为100元';
    } else if (goalAmount > 10000) {
      newErrors.goalAmount = '目标金额不能超过10000元';
    }

    if (!creatorName.trim()) {
      newErrors.creatorName = '请输入发起人名称';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || '文件验证失败');
      return;
    }

    setUploadError('');
    try {
      const base64 = await fileToBase64(file);
      setCoverImage(base64);
      setCoverImagePreview(base64);
    } catch (error) {
      setUploadError('图片读取失败');
