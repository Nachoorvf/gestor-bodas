'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../../firebase/config';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Card from '../../../components/ui/Card';

export default function PresupuestoPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState(null);
    const [expenses, setExpenses] = useState([]);

    // GUEST STATS
    const [confirmedCount, setConfirmedCount] = useState(0);

    // MODAL STATE
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Otros',
        type: 'fijo', // 'fijo' | 'variable'
        unitPrice: 0, // Used if type === 'variable'
        estimated: 0,
        paid: 0
    });

    const categories = ['Lugar', 'Comida', 'Música', 'Foto/Video', 'Ropa', 'Decoración', 'Otros'];

    useEffect(() => {
        const fetchUserData = async () => {
            auth.onAuthStateChanged(async (user) => {
                if (!user) { router.push('/login'); return; }
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setWeddingId(userDoc.data().weddingId);
                }
                setLoading(false);
            });
        };
        fetchUserData();
    }, [router]);

    useEffect(() => {
        if (!weddingId) return;

        // 1. Listen to Expenses
        const qExpenses = query(collection(db, 'weddings', weddingId, 'expenses'), orderBy('createdAt', 'desc'));
        const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // 2. Listen to Guests (for confirmed count)
        // Optimization: We could just get count(). Using snapshot for realtime updates.
        const qGuests = collection(db, 'weddings', weddingId, 'guests');
        const unsubGuests = onSnapshot(qGuests, (snapshot) => {
            const confirmed = snapshot.docs.filter(d => d.data().confirmado === true).length;
            setConfirmedCount(confirmed);
        });

        return () => {
            unsubExpenses();
            unsubGuests();
        };
    }, [weddingId]);

    // DYNAMIC CALCULATION
    const getEstimatedCost = (expense) => {
        if (expense.type === 'variable') {
            return Number(expense.unitPrice || 0) * confirmedCount;
        }
        return Number(expense.estimated || 0);
    };

    // STATS
    const totalEstimated = expenses.reduce((acc, curr) => acc + getEstimatedCost(curr), 0);
    const totalPaid = expenses.reduce((acc, curr) => acc + Number(curr.paid), 0);
    const totalPending = totalEstimated - totalPaid;

    const handleOpenModal = (expense = null) => {
        if (expense) {
            setEditingId(expense.id);
            setFormData({
                name: expense.name,
                category: expense.category,
                type: expense.type || 'fijo',
                unitPrice: expense.unitPrice || 0,
                estimated: expense.estimated || 0,
                paid: expense.paid || 0
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                category: 'Otros',
                type: 'fijo',
                unitPrice: 0,
                estimated: 0,
                paid: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            // If variable, we don't save 'estimated' (or we save it as cache, but UI uses dynamic)
            // We will save 'estimated' mainly for fallback, but logic relies on unitPrice
            const calculatedEstimated = formData.type === 'variable'
                ? Number(formData.unitPrice) * confirmedCount
                : Number(formData.estimated);

            const data = {
                ...formData,
                type: formData.type,
                unitPrice: Number(formData.unitPrice),
                estimated: calculatedEstimated, // Saved as cache/snapshot
                paid: Number(formData.paid),
                createdAt: new Date().toISOString()
            };

            if (editingId) {
                await updateDoc(doc(db, 'weddings', weddingId, 'expenses', editingId), data);
            } else {
                await addDoc(collection(db, 'weddings', weddingId, 'expenses'), data);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Borrar este gasto?")) return;
        try {
            await deleteDoc(doc(db, 'weddings', weddingId, 'expenses', editingId));
            setIsModalOpen(false);
        } catch (error) {
            alert("Error al borrar");
        }
    };

    if (loading) return <div className="p-8 text-center text-boda-text-light">Cargando...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-serif text-boda-text">Presupuesto</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-boda-pink text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-boda-pink-dark transition"
                >
                    + Nuevo Gasto
                </button>
            </div>

            {/* INFO BOX GUESTS */}
            <div className="mb-6 flex items-center justify-end">
                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    Invitados Confirmados: <strong className="text-black">{confirmedCount}</strong> (Para gastos variables)
                </span>
            </div>

            {/* STATS CARDS */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Presupuesto Total</p>
                    <p className="text-4xl font-serif text-boda-text mt-2">{totalEstimated.toLocaleString()}€</p>
                </Card>
                <Card>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Pagado</p>
                    <p className="text-4xl font-serif text-boda-text mt-2">{totalPaid.toLocaleString()}€</p>
                </Card>
                <Card>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Pendiente</p>
                    <p className="text-4xl font-serif text-rose-500 mt-2">{totalPending.toLocaleString()}€</p>
                </Card>
            </div>

            {/* EXPENSES TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase">Concepto</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase">Categoría</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Estimado</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Pagado</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {expenses.map(expense => {
                            const calculatedEst = getEstimatedCost(expense);
                            return (
                                <tr
                                    key={expense.id}
                                    onClick={() => handleOpenModal(expense)}
                                    className="hover:bg-gray-50/50 transition cursor-pointer"
                                >
                                    <td className="p-4 font-bold text-boda-text">
                                        {expense.name}
                                        {expense.type === 'variable' && (
                                            <span className="ml-2 bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded border border-blue-100 font-normal">
                                                Variable ({expense.unitPrice}€/p)
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{expense.category}</span>
                                    </td>
                                    <td className="p-4 text-right font-mono text-gray-600">
                                        {calculatedEst.toLocaleString()}€
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-boda-text">{Number(expense.paid).toLocaleString()}€</td>
                                    <td className="p-4 text-center">
                                        {Number(expense.paid) >= calculatedEst ? (
                                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">Pagado</span>
                                        ) : Number(expense.paid) > 0 ? (
                                            <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Parcial</span>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Pendiente</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {expenses.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-400">No hay gastos registrados aún.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-serif text-boda-text">
                                {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleSave} className="flex flex-col gap-4">
                            {/* TYPE SELECTOR */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl mb-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'fijo' })}
                                    className={`py-2 text-xs font-bold uppercase rounded-lg transition ${formData.type === 'fijo' ? 'bg-white shadow text-boda-text' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Fijo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'variable' })}
                                    className={`py-2 text-xs font-bold uppercase rounded-lg transition ${formData.type === 'variable' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Variable
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Concepto</label>
                                <input
                                    type="text" required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* VARIABLE VS FIXED INPUTS */}
                            <div className="grid grid-cols-2 gap-4">
                                {formData.type === 'variable' ? (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-blue-500 uppercase">€ / Persona</label>
                                            <input
                                                type="number" min="0" required
                                                className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 font-bold"
                                                value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase">Total Estimado</label>
                                            <div className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-mono">
                                                {(Number(formData.unitPrice || 0) * confirmedCount).toLocaleString()}€
                                            </div>
                                            <p className="text-[9px] text-gray-400 mt-1 text-right">x {confirmedCount} invitados</p>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Estimado (€)</label>
                                        <input
                                            type="number" min="0" required
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                                            value={formData.estimated} onChange={(e) => setFormData({ ...formData, estimated: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Pagado (€)</label>
                                    <input
                                        type="number" min="0" required
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                                        value={formData.paid} onChange={(e) => setFormData({ ...formData, paid: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                                {editingId && (
                                    <button type="button" onClick={handleDelete} className="px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition">
                                        Borrar
                                    </button>
                                )}
                                <button type="submit" className="flex-1 bg-boda-pink text-white py-3 rounded-xl font-bold hover:bg-boda-pink-dark transition">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
