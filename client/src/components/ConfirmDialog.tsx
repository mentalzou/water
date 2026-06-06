import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 自定义确认弹窗 — 按钮位置统一（确认在右，取消在左）
 * 替代浏览器原生 confirm()，避免微信浏览器中按钮位置不一致的问题
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* 弹窗卡片 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in">
        {/* 关闭按钮 */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-8 pb-6">
          {/* 标题 */}
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              {title}
            </h3>
          )}

          {/* 内容 */}
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            {message}
          </p>
        </div>

        {/* 按钮区：取消在左，确认在右 */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
