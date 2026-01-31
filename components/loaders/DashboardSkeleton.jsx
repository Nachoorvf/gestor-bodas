import Link from 'next/link';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';

export default function DashboardSkeleton() {
    return (
        <div>
            <div className="mb-8">
                <Skeleton className="h-10 w-64 mb-2 bg-gray-300" />
                <Skeleton className="h-4 w-48" />
            </div>

            {/* COUNTDOWN HERO */}
            <div className="relative overflow-hidden rounded-3xl bg-gray-100 shadow-xl shadow-gray-200/50 mb-8 p-8 md:p-12 animate-pulse h-[300px]">
                <div className="flex flex-col h-full justify-between">
                    <Skeleton className="h-32 w-40 rounded-3xl bg-gray-200" />
                    <Skeleton className="h-6 w-64 bg-gray-200" />
                </div>
            </div>

            {/* QUICK STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="flex flex-col justify-between h-48">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <Skeleton className="h-12 w-12 rounded-xl" />
                            </div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    </Card>
                ))}
            </div>

            {/* SHORTCUTS */}
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="flex gap-4 overflow-x-auto pb-4">
                {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-4 bg-white border border-gray-100 rounded-xl min-w-[200px]">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
