import React, { useState } from 'react';
import { TravelRecord, generateId } from './data-store';

interface TravelFormProps {
  onSubmit: (record: TravelRecord) => void;
}

export default function TravelForm({ onSubmit }: TravelFormProps) {
  const [placeName, setPlaceName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [arriveTime, setArriveTime] = useState('');
  const [leaveTime, setLeaveTime] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!placeName.trim()) e.placeName = '请输入地点名称';
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) e.latitude = '纬度范围 -90~90';
    if (isNaN(lng) || lng < -180 || lng > 180) e.longitude = '经度范围 -180~180';
    if (!arriveTime) e.arriveTime = '请选择到达时间';
    if (!leaveTime) e.leaveTime = '请选择离开时间';
    if (arriveTime && leaveTime && arriveTime > leaveTime)
      e.leaveTime = '离开时间不能早于到达时间';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const record: TravelRecord = {
      id: generateId(),
      placeName: placeName.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      arriveTime,
      leaveTime,
      description: description.trim(),
      imageUrls: imageUrls
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u.length > 0),
    };
    onSubmit(record);
    setPlaceName('');
    setLatitude('');
    setLongitude('');
    setArriveTime('');
    setLeaveTime('');
    setDescription('');
    setImageUrls('');
    setErrors({});
  }

  return (
    <div className="travel-form-wrapper">
      <button
        className="toggle-form-btn"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? '✕ 关闭表单' : '＋ 添加旅行记录'}
      </button>

      <form
        className={`travel-form ${visible ? 'travel-form--visible' : ''}`}
        onSubmit={handleSubmit}
      >
        <h3 className="form-title">新增旅行足迹</h3>

        <div className="form-row">
          <label>地点名称</label>
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="例如：巴黎"
          />
          {errors.placeName && <span className="error">{errors.placeName}</span>}
        </div>

        <div className="form-row form-row--2col">
          <div>
            <label>纬度</label>
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="48.8566"
            />
            {errors.latitude && <span className="error">{errors.latitude}</span>}
          </div>
          <div>
            <label>经度</label>
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="2.3522"
            />
            {errors.longitude && <span className="error">{errors.longitude}</span>}
          </div>
        </div>

        <div className="form-row form-row--2col">
          <div>
            <label>到达时间</label>
            <input
              type="datetime-local"
              value={arriveTime}
              onChange={(e) => setArriveTime(e.target.value)}
            />
            {errors.arriveTime && <span className="error">{errors.arriveTime}</span>}
          </div>
          <div>
            <label>离开时间</label>
            <input
              type="datetime-local"
              value={leaveTime}
              onChange={(e) => setLeaveTime(e.target.value)}
            />
            {errors.leaveTime && <span className="error">{errors.leaveTime}</span>}
          </div>
        </div>

        <div className="form-row">
          <label>描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="写下你的旅行感受..."
            rows={3}
          />
        </div>

        <div className="form-row">
          <label>图片URL（每行一个）</label>
          <textarea
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            placeholder="https://example.com/photo1.jpg"
            rows={2}
          />
        </div>

        <button type="submit" className="submit-btn">
          保存记录
        </button>
      </form>
    </div>
  );
}
