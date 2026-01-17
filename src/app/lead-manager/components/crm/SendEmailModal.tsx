'use client';
import React, { useState } from 'react';
import { X, Mail, Send, Loader2 } from 'lucide-react';

interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: { to: string; subject: string; body: string }) => Promise<void>;
    defaultEmail?: string;
    defaultSubject?: string;
    defaultBody?: string;
}

export default function SendEmailModal({
    isOpen,
    onClose,
    onSend,
    defaultEmail = '',
    defaultSubject = '',
    defaultBody = '',
}: SendEmailModalProps) {
    const [to, setTo] = useState(defaultEmail);
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [isSending, setIsSending] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!to || !subject) return;

        setIsSending(true);
        try {
            await onSend({ to, subject, body });
            onClose();
        } catch (error) {
            console.error('Failed to send email:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Mail className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">제안서 이메일 발송</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            받는 사람 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            required
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="example@email.com"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            제목 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="메일 제목을 입력하세요"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            내용
                        </label>
                        <textarea
                            rows={6}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="메일 내용을 입력하세요"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            * 제안서 PDF 파일이 자동으로 첨부되어 발송됩니다.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isSending}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    발송 중...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    발송하기
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
