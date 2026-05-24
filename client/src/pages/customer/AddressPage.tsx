import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Plus, Edit2, Trash2, ArrowLeft
} from 'lucide-react';
import { customerApi } from '../../api/customer.api';

export default function AddressPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ contact_name: '', contact_phone: '', detail: '', is_default: false });
  const [loading, setLoading] = useState(false);

  function loadAddresses() {
    customerApi.getAddresses().then((res: any) => {
      setAddresses(Array.isArray(res.data) ? res.data : []);
    });
  }

  useEffect(() => { loadAddresses(); }, []);

  function startEdit(addr?: any) {
    if (addr) {
      setEditing(addr.id);
      setForm({
        contact_name: addr.contact_name,
        contact_phone: addr.contact_phone,
        detail: addr.detail,
        is_default: !!addr.is_default,
      });
    } else {
      setEditing('new');
      setForm({ contact_name: '', contact_phone: '', detail: '', is_default: false });
    }
  }

  function cancelEdit() { setEditing(null); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contact_name || !form.contact_phone || !form.detail) return;
    setLoading(true);
    try {
      let res;
      if (editing === 'new') {
        res = await customerApi.addAddress(form);
      } else {
        res = await customerApi.updateAddress(editing!, form);
      }
      if ((res as any).code === 200) {
        loadAddresses();
        cancelEdit();
      }
    } catch {}
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除该地址？')) return;
    await customerApi.deleteAddress(id);
    loadAddresses();
  }

  async function handleSetDefault(id: string) {
    await customerApi.updateAddress(id, { is_default: true });
    loadAddresses();
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">收货地址</h1>
        </div>
      </header>

      <main className="px-4 py-4 pb-8">
        {/* 新增按钮 */}
        {!editing && (
          <button onClick={() => startEdit()}
            className="w-full mb-4 py-3 rounded-xl border-2 border-dashed border-water/30 text-water font-medium flex items-center justify-center gap-2 active:bg-water/5 transition-colors"
          >
            <Plus className="w-4 h-4" />新增收货地址
          </button>
        )}

        {/* 编辑表单 */}
        {editing && (
          <form onSubmit={handleSave} className="bg-white rounded-xl p-4 border border-water/30 mb-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">{editing === 'new' ? '新增地址' : '编辑地址'}</h3>
            <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="联系人姓名" required
              className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20" />
            <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="手机号" maxLength={11} required
              className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20" />
            <textarea value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="详细地址" rows={2} required
              className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20 resize-none" />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="w-4 h-4 accent-water" />
              设为默认地址
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={cancelEdit} className="flex-1 py-2.5 rounded-lg text-sm text-gray-600 bg-gray-100 font-medium active:bg-gray-200">取消</button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-lg text-sm text-white bg-water font-medium active:bg-water/80 disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        )}

        {/* 地址列表 */}
        {addresses.length === 0 && !editing && (
          <div className="text-center py-12 text-gray-400 text-sm">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
            还没有收货地址，点击上方添加
          </div>
        )}

        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className={`relative bg-white rounded-xl p-4 border ${addr.is_default ? 'border-water/40' : 'border-gray-100'}`}>
              {!!addr.is_default && (
                <span className="absolute top-2 right-2 text-[10px] font-medium text-water bg-water/10 px-2 py-0.5 rounded-full">默认</span>
              )}
              <p className="font-medium text-gray-800 text-sm">{addr.contact_name}<span className="ml-2 text-gray-400 font-normal">{addr.contact_phone}</span></p>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed whitespace-pre-wrap">{addr.detail}</p>
              <div className="flex gap-3 mt-3">
                <button onClick={() => handleSetDefault(addr.id)} className={`text-xs ${addr.is_default ? 'text-gray-300' : 'text-blue-500'}`}>设为默认</button>
                <button onClick={() => startEdit(addr)} className="text-xs text-blue-500 flex items-center gap-0.5"><Edit2 className="w-3 h-3" />编辑</button>
                <button onClick={() => handleDelete(addr.id)} className="text-xs text-red-400 flex items-center gap-0.5"><Trash2 className="w-3 h-3" />删除</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
