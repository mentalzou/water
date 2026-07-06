import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin, Plus, Edit2, Trash2, ArrowLeft
} from 'lucide-react';
import { customerApi } from '../../api/customer.api';
import BottomNav from '../../components/BottomNav';

interface RegionNode {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  children: RegionNode[];
}

export default function AddressPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    contact_name: '', contact_phone: '', province: '', city: '', district: '', detail: '', building_type: 'stairs', floor: 1, is_default: false
  });
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loading, setLoading] = useState(false);

  // 省市区树数据
  const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
  const [cities, setCities] = useState<RegionNode[]>([]);
  const [districts, setDistricts] = useState<RegionNode[]>([]);

  const fromPage = location.state?.from;

  // 省份列表
  const provinces = regionTree;

  // 加载省市区数据
  useEffect(() => {
    customerApi.getRegionTree().then((res: any) => {
      if (res.code === 200) {
        setRegionTree(res.data || []);
      }
    }).catch(() => {});
  }, []);

  function handleBack() {
    if (fromPage === 'confirm-order') {
      navigate(-1);
    } else {
      navigate('/profile', { replace: true });
    }
  }

  function handleSelectAddress(addr: any) {
    if (fromPage === 'confirm-order') {
      window.location.replace('/order/confirm?address_id=' + addr.id);
    } else {
      handleSetDefault(addr.id);
    }
  }

  function loadAddresses() {
    customerApi.getAddresses().then((res: any) => {
      setAddresses(Array.isArray(res.data) ? res.data : []);
    });
  }

  useEffect(() => { loadAddresses(); }, []);

  // 楼房类型或楼层变化时计算配送费
  async function calcFee() {
    if (!form.building_type || !form.floor) { setDeliveryFee(0); return; }
    try {
      const res: any = await customerApi.calculateDeliveryFee(form.building_type, form.floor);
      if (res.code === 200) setDeliveryFee(res.data?.delivery_fee ?? 0);
    } catch { setDeliveryFee(0); }
  }
  useEffect(() => { calcFee(); }, [form.building_type, form.floor]);

  // 当省份变化时，更新城市列表
  function handleProvinceChange(provinceName: string) {
    const province = regionTree.find(p => p.name === provinceName);
    const cityList = province?.children || [];
    setCities(cityList);
    setDistricts([]);
    setForm(f => ({
      ...f,
      province: provinceName,
      city: cityList.length === 1 ? cityList[0].name : '',
      district: '',
    }));
    if (cityList.length === 1) {
      const districtList = cityList[0].children || [];
      setDistricts(districtList);
    }
  }

  // 当城市变化时，更新区县列表
  function handleCityChange(cityName: string) {
    const province = regionTree.find(p => p.name === form.province);
    const city = province?.children?.find(c => c.name === cityName);
    const districtList = city?.children || [];
    setDistricts(districtList);
    setForm(f => ({
      ...f,
      city: cityName,
      district: districtList.length === 1 ? districtList[0].name : '',
    }));
  }

  function startEdit(addr?: any) {
    if (addr) {
      setEditing(addr.id);
      const p = addr.province || '';
      const c = addr.city || '';
      const d = addr.district || '';
      setForm({
        contact_name: addr.contact_name,
        contact_phone: addr.contact_phone,
        province: p,
        city: c,
        district: d,
        detail: addr.detail,
        building_type: addr.building_type || 'stairs',
        floor: addr.floor || 1,
        is_default: !!addr.is_default,
      });
      // 根据已保存的省/市加载子级列表
      const province = regionTree.find(r => r.name === p);
      if (province) {
        setCities(province.children || []);
        const city = province.children?.find(r => r.name === c);
        if (city) setDistricts(city.children || []);
      }
    } else {
      setEditing('new');
      setForm({ contact_name: '', contact_phone: '', province: '', city: '', district: '', detail: '', building_type: 'stairs', floor: 1, is_default: false });
      setCities([]);
      setDistricts([]);
    }
  }

  function cancelEdit() { setEditing(null); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contact_name || !form.contact_phone || !form.province || !form.city || !form.district || !form.detail) {
      alert('请填写完整信息（联系人、手机号、省/市/区、详细地址）');
      return;
    }
    if (!form.building_type) {
      alert('请选择楼房类型');
      return;
    }
    if (!form.floor || form.floor < 1) {
      alert('请选择楼层');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (editing === 'new') {
        res = await customerApi.addAddress({
          ...form,
          is_default: form.is_default ? 1 : 0,
        });
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
      <div className="min-h-screen bg-primary-50 pb-20">
        <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">
              {fromPage === 'confirm-order' ? '选择收货地址' : '收货地址'}
            </h1>
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

                {/* 省市区级联选择 */}
                <div className="grid grid-cols-3 gap-2">
                  <select value={form.province} onChange={e => handleProvinceChange(e.target.value)} required
                          className="px-3 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20">
                    <option value="">请选择省</option>
                    {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <select value={form.city} onChange={e => handleCityChange(e.target.value)} required
                          className="px-3 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20">
                    <option value="">请选择市</option>
                    {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} required
                          className="px-3 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20">
                    <option value="">请选择区</option>
                    {districts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>

                <textarea value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="详细地址（街道、门牌号等）" rows={2} required
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20 resize-none" />

                {/* 楼房类型 + 楼层 */}
                <div className="flex gap-2">
                  <select value={form.building_type} onChange={e => setForm(f => ({ ...f, building_type: e.target.value }))} required
                          className="flex-1 px-3 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20">
                    <option value="stairs">楼梯房</option>
                    <option value="elevator">电梯房</option>
                  </select>
                  <input type="text" inputMode="numeric" pattern="[0-9]*"
                         value={form.floor > 0 ? form.floor : ''}
                         onChange={e => {
                           const raw = e.target.value.replace(/\D/g, '');
                           const num = raw === '' ? 0 : Math.min(99, parseInt(raw));
                           setForm(f => ({ ...f, floor: num }));
                         }}
                         placeholder="楼层" maxLength={2}
                         className="w-20 px-3 py-2.5 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-water/20" />
                </div>

                {/* 配送费预览 */}
                {deliveryFee >= 0 && (
                  <div className="px-3 py-2 bg-green-50 rounded-lg text-sm text-gray-700 flex items-center justify-between">
                    <span>预估配送费</span>
                    <span className="font-semibold text-green-600">{deliveryFee > 0 ? `¥${deliveryFee.toFixed(2)}` : '免费'}</span>
                  </div>
                )}

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
                <div
                    key={addr.id}
                    className={`relative bg-white rounded-xl p-4 border cursor-pointer transition-all ${
                        addr.is_default ? 'border-water/40' : 'border-gray-100'
                    } ${fromPage === 'confirm-order' ? 'active:bg-gray-50' : ''}`}
                    onClick={() => fromPage === 'confirm-order' && handleSelectAddress(addr)}
                >
                  {addr.is_default === 1 && (
                      <span className="absolute top-2 right-2 text-[10px] font-medium text-water bg-water/10 px-2 py-0.5 rounded-full">默认</span>
                  )}
                  <p className="font-medium text-gray-800 text-sm">{addr.contact_name}<span className="ml-2 text-gray-400 font-normal">{addr.contact_phone}</span></p>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed whitespace-pre-wrap">{addr.province}{addr.city}{addr.district} {addr.detail}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {addr.building_type === 'elevator' ? '🛗 电梯房' : '🏢 楼梯房'} · {addr.floor || 1}层
                  </p>
                  {fromPage !== 'confirm-order' && (
                      <div className="flex gap-3 mt-3">
                        <button onClick={() => handleSetDefault(addr.id)} className={`text-xs ${addr.is_default ? 'text-gray-300' : 'text-blue-500'}`}>设为默认</button>
                        <button onClick={() => startEdit(addr)} className="text-xs text-blue-500 flex items-center gap-0.5"><Edit2 className="w-3 h-3" />编辑</button>
                        <button onClick={() => handleDelete(addr.id)} className="text-xs text-red-400 flex items-center gap-0.5"><Trash2 className="w-3 h-3" />删除</button>
                      </div>
                  )}
                </div>
            ))}
          </div>

        </main>

        <BottomNav />
      </div>
  );
}
