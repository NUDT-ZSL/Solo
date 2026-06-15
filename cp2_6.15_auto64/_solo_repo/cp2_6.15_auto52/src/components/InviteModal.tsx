import React, { useState } from 'react';
import { X, Mail, Check, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const InviteModal: React.FC = () => {
  const showInviteModal = useStore((state) => state.showInviteModal);
  const setShowInviteModal = useStore((state) => state.setShowInviteModal);
  const sendInvite = useStore((state) => state.sendInvite);

  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setShowInviteModal(false);
    setEmail('');
    setIsSuccess(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setIsSending(true);

    try {
      const success = await sendInvite(email);
      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError('发送邀请失败，请重试');
      }
    } catch (err) {
      setError('发送邀请失败，请重试');
    } finally {
      setIsSending(false);
    }
  };

  if (!showInviteModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div
        className="
          relative w-[320px] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)]
          transform transition-all duration-300 ease-out
          animate-in fade-in zoom-in-95 duration-200
        "
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">邀请成员</h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check size={32} className="text-green-500" />
              </div>
              <div className="text-lg font-medium text-gray-800 mb-1">
                邀请已发送
              </div>
              <div className="text-sm text-gray-500">
                邀请已发送至 {email}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  输入团队成员的邮箱地址，邀请他们参与虚拟策展协作。
                </p>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="
                      w-full pl-10 pr-4 py-3 rounded-xl
                      bg-gray-50 border border-gray-200
                      text-gray-800 placeholder-gray-400
                      focus:outline-none focus:border-[#6c63ff] focus:bg-white
                      transition-all duration-300 ease-out
                    "
                    disabled={isSending}
                  />
                </div>

                {error && (
                  <div className="mt-2 text-sm text-red-500">{error}</div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="
                  w-full py-3 rounded-xl text-base font-medium
                  bg-[#6c63ff] text-white
                  hover:bg-[#5a52e0] active:bg-[#4a42d0]
                  disabled:bg-gray-300 disabled:cursor-not-allowed
                  transition-all duration-300 ease-out
                  flex items-center justify-center gap-2
                "
              >
                {isSending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    发送中...
                  </>
                ) : (
                  '发送邀请'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
