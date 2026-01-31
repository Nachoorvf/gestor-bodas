
export default function AdminTabs({ tabs, activeTab, onChange }) {
    return (
        <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto md:mx-0">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`
                        px-6 py-2 rounded-lg text-sm font-bold transition-all
                        ${activeTab === tab.id
                            ? 'bg-boda-text text-white shadow-md'
                            : 'text-gray-400 hover:text-boda-text hover:bg-gray-50'
                        }
                    `}
                >
                    {tab.label}
                    {tab.count > 0 && (
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
