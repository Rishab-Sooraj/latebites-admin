'use client';

import { useState } from 'react';
import { Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function CleanupPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ message: string; deleted: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runCleanup = async () => {
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const response = await fetch('/api/support/cleanup', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to run cleanup');
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Support Chat Cleanup</h1>
                <p className="text-zinc-400 mb-8">
                    Delete conversations and messages older than 7 days to save database space.
                </p>

                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-amber-500/10 rounded-lg">
                            <Trash2 className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-1">
                                Automatic Cleanup
                            </h2>
                            <p className="text-sm text-zinc-400">
                                This will delete all support conversations and their messages that haven't been updated in the last 7 days.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={runCleanup}
                        disabled={loading}
                        className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Running Cleanup...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-5 h-5" />
                                Run Cleanup Now
                            </>
                        )}
                    </button>

                    {result && (
                        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-emerald-500 font-medium">{result.message}</p>
                                <p className="text-sm text-emerald-400 mt-1">
                                    Deleted {result.deleted} conversation{result.deleted !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-500 font-medium">Error</p>
                                <p className="text-sm text-red-400 mt-1">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-3">
                        Automatic Scheduling
                    </h3>
                    <p className="text-sm text-zinc-400 mb-4">
                        To run this cleanup automatically, you can set up a cron job or use a service like Vercel Cron Jobs.
                    </p>
                    <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2">Example cron job (runs daily at 2 AM):</p>
                        <code className="text-sm text-amber-400 font-mono">
                            0 2 * * * curl -X POST https://your-domain.com/api/support/cleanup
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
}
