import { useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Input,
  AutoComplete,
  DatePicker,
  Upload,
  message,
} from 'antd'
import {
  CloseOutlined,
  CameraOutlined,
  LoadingOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { UploadFile, UploadProps } from 'antd/es/upload'

import './index.css'
import { useGoldRecords } from '../../hooks/useGoldRecords'
import { ocrApi } from '../../services/apiService'
import {
  type WeightUnit,
  UNIT_LABELS,
  toGrams,
  fromGrams,
  getFunMessage,
} from '../../utils/units'

const { TextArea } = Input

// 预设购买渠道
const CHANNEL_OPTIONS = [
  { value: '银行金条' },
  { value: '金店' },
  { value: '线上平台' },
  { value: '积存金' },
  { value: '其他' },
]

// 单位切换顺序
const UNIT_CYCLE: WeightUnit[] = ['g', 'liang', 'ton']

export default function GoldAdd() {
  const navigate = useNavigate()
  const { addRecord, isAdding } = useGoldRecords()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ===== 状态 =====
  // 重量相关
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('g')
  const [weightValue, setWeightValue] = useState<string>('')
  const [gramsInStore, setGramsInStore] = useState<number>(0) // 实际存储的克数

  // 模式切换
  const [mode, setMode] = useState<'summary' | 'detail'>('summary')

  // 价格相关
  const [totalPrice, setTotalPrice] = useState<string>('')
  const [unitPrice, setUnitPrice] = useState<string>('')

  // 其他字段
  const [channel, setChannel] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [purchaseDate, setPurchaseDate] = useState<dayjs.Dayjs>(dayjs())
  const [photos, setPhotos] = useState<UploadFile[]>([])

  // AI识图状态
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null)

  // 表单错误
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 单位切换动画
  const [isUnitAnimating, setIsUnitAnimating] = useState(false)

  // ===== 计算属性 =====
  const funMessage = useMemo(() => {
    return getFunMessage(gramsInStore, weightUnit)
  }, [gramsInStore, weightUnit])

  const calculatedUnitPrice = useMemo(() => {
    const weight = gramsInStore
    const total = parseFloat(totalPrice) || 0
    if (weight > 0 && total > 0) {
      return (total / weight).toFixed(2)
    }
    return ''
  }, [gramsInStore, totalPrice])

  const calculatedTotalPrice = useMemo(() => {
    const weight = gramsInStore
    const unit = parseFloat(unitPrice) || 0
    if (weight > 0 && unit > 0) {
      return (unit * weight).toFixed(2)
    }
    return ''
  }, [gramsInStore, unitPrice])

  // ===== 事件处理 =====
  // 切换单位
  const handleUnitToggle = useCallback(() => {
    setIsUnitAnimating(true)
    const currentIndex = UNIT_CYCLE.indexOf(weightUnit)
    const nextUnit = UNIT_CYCLE[(currentIndex + 1) % UNIT_CYCLE.length]

    // 转换当前值到新单位
    if (weightValue && !isNaN(parseFloat(weightValue))) {
      const grams = toGrams(parseFloat(weightValue), weightUnit)
      const newValue = fromGrams(grams, nextUnit)
      const decimals = nextUnit === 'ton' ? 6 : 2
      setWeightValue(newValue.toFixed(decimals))
    }

    setWeightUnit(nextUnit)
    setTimeout(() => setIsUnitAnimating(false), 300)
  }, [weightUnit, weightValue])

  // 重量输入变化
  const handleWeightChange = (value: string) => {
    // 只允许数字和小数点
    const decimals = weightUnit === 'ton' ? 6 : 2
    const regex = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`)

    if (value === '' || regex.test(value)) {
      setWeightValue(value)
      const numValue = parseFloat(value) || 0
      const grams = toGrams(numValue, weightUnit)
      setGramsInStore(grams)

      // 清除重量错误
      if (errors.weight && grams > 0) {
        setErrors((prev) => ({ ...prev, weight: '' }))
      }
    }
  }

  // AI识图
  const handleOcrClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsOcrLoading(true)
    setOcrConfidence(null)

    try {
      const result = await ocrApi.recognizeWeight(file)
      if (result.weight && result.weight > 0) {
        const grams = result.weight
        setGramsInStore(grams)
        const displayValue = fromGrams(grams, weightUnit)
        const decimals = weightUnit === 'ton' ? 6 : 2
        setWeightValue(displayValue.toFixed(decimals))
        setOcrConfidence(result.confidence)
        message.success(`识别成功！置信度: ${(result.confidence * 100).toFixed(0)}%`)

        // 清除错误
        if (errors.weight) {
          setErrors((prev) => ({ ...prev, weight: '' }))
        }
      } else {
        message.error('未能识别出重量，请手动输入')
      }
    } catch (err) {
      message.error('识别失败，请手动输入')
    } finally {
      setIsOcrLoading(false)
      // 重置input以允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 模式切换
  const handleModeChange = (newMode: 'summary' | 'detail') => {
    setMode(newMode)
    // 切换时清空价格，避免混淆
    setTotalPrice('')
    setUnitPrice('')
    setErrors((prev) => ({ ...prev, price: '' }))
  }

  // 价格输入处理
  const handleTotalPriceChange = (value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setTotalPrice(value)
      if (errors.price && parseFloat(value) > 0) {
        setErrors((prev) => ({ ...prev, price: '' }))
      }
    }
  }

  const handleUnitPriceChange = (value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setUnitPrice(value)
      if (errors.price && parseFloat(value) > 0) {
        setErrors((prev) => ({ ...prev, price: '' }))
      }
    }
  }

  // 照片上传
  const handlePhotoChange: UploadProps['onChange'] = ({ fileList }) => {
    setPhotos(fileList.slice(0, 3))
  }

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件!')
    }
    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('图片大小不能超过5MB!')
    }
    return false // 阻止自动上传，使用本地存储
  }

  // 表单校验
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // 重量校验
    if (gramsInStore <= 0) {
      newErrors.weight = '请输入重量'
    } else if (gramsInStore < 0.01) {
      newErrors.weight = '重量不能小于0.01克'
    } else if (gramsInStore > 99999.99) {
      newErrors.weight = '重量不能超过99999.99克'
    }

    // 价格校验
    if (mode === 'summary') {
      if (!totalPrice || parseFloat(totalPrice) <= 0) {
        newErrors.price = '请输入成交总价'
      }
    } else {
      if (!unitPrice || parseFloat(unitPrice) <= 0) {
        newErrors.price = '请输入单价'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 保存
  const handleSave = async () => {
    if (!validateForm()) {
      message.error('请检查表单填写')
      return
    }

    try {
      // 处理照片 - 转为 base64
      const photoBase64s: string[] = []
      for (const photo of photos) {
        if (photo.originFileObj) {
          const base64 = await fileToBase64(photo.originFileObj)
          photoBase64s.push(base64)
        }
      }

      const recordData = {
        weight: gramsInStore,
        total_price: mode === 'summary' ? parseFloat(totalPrice) : parseFloat(calculatedTotalPrice),
        unit_price: mode === 'detail' ? parseFloat(unitPrice) : parseFloat(calculatedUnitPrice),
        mode,
        channel: channel || '其他',
        note,
        purchase_date: purchaseDate.format('YYYY-MM-DD'),
        photos: photoBase64s,
      }

      await addRecord(recordData)
      message.success('保存成功！')
      navigate('/gold')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  // 文件转 base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  // 涟漪效果
  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const ripple = document.createElement('span')
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    `
    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
  }

  return (
    <motion.div
      className="gold-add-page"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="gold-add-container">
        {/* 顶部栏 */}
        <header className="gold-add-header">
          <button className="header-btn" onClick={() => navigate(-1)}>
            <CloseOutlined />
          </button>
          <h1 className="header-title">攒金</h1>
          <div className="header-placeholder" />
        </header>

        {/* 滚动内容区 */}
        <div className="gold-add-content">
          {/* 重量输入区域 */}
          <section className="weight-section">
            <div className="weight-input-wrapper">
              <input
                type="text"
                inputMode="decimal"
                className="weight-input"
                placeholder="0"
                value={weightValue}
                onChange={(e) => handleWeightChange(e.target.value)}
              />
              <motion.button
                className="unit-toggle-btn"
                onClick={handleUnitToggle}
                animate={isUnitAnimating ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
                whileTap={{ scale: 0.9 }}
              >
                {UNIT_LABELS[weightUnit]}
              </motion.button>
            </div>

            {/* 趣味提示 */}
            <AnimatePresence mode="wait">
              {funMessage && (
                <motion.p
                  key={funMessage}
                  className="fun-message"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  {funMessage}
                </motion.p>
              )}
            </AnimatePresence>

            {/* AI识图按钮 */}
            <button
              className="ocr-btn"
              onClick={handleOcrClick}
              disabled={isOcrLoading}
            >
              {isOcrLoading ? (
                <LoadingOutlined className="ocr-icon spinning" />
              ) : (
                <CameraOutlined className="ocr-icon" />
              )}
              <span>AI识图</span>
              {ocrConfidence !== null && (
                <span className="ocr-confidence">
                  置信度 {(ocrConfidence * 100).toFixed(0)}%
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {/* 重量错误提示 */}
            <AnimatePresence>
              {errors.weight && (
                <motion.p
                  className="error-text"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {errors.weight}
                </motion.p>
              )}
            </AnimatePresence>
          </section>

          {/* 模式切换 */}
          <section className="mode-section">
            <div className="mode-tabs">
              <motion.div
                className="mode-slider"
                layoutId="modeSlider"
                animate={{
                  x: mode === 'summary' ? 0 : '100%',
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              />
              <button
                className={`mode-tab ${mode === 'summary' ? 'active' : ''}`}
                onClick={() => handleModeChange('summary')}
              >
                汇总模式
              </button>
              <button
                className={`mode-tab ${mode === 'detail' ? 'active' : ''}`}
                onClick={() => handleModeChange('detail')}
              >
                明细模式
              </button>
            </div>

            {/* 价格输入区域 */}
            <div className="price-input-area">
              <AnimatePresence mode="wait">
                {mode === 'summary' ? (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="price-field"
                  >
                    <label>成交总价 (元)</label>
                    <Input
                      size="large"
                      placeholder="请输入总价"
                      value={totalPrice}
                      onChange={(e) => handleTotalPriceChange(e.target.value)}
                      prefix="¥"
                      className="dark-input"
                    />
                    {calculatedUnitPrice && (
                      <p className="calculated-hint">
                        折合单价: ¥{calculatedUnitPrice}/克
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="price-field"
                  >
                    <label>单价 (元/克)</label>
                    <Input
                      size="large"
                      placeholder="请输入单价"
                      value={unitPrice}
                      onChange={(e) => handleUnitPriceChange(e.target.value)}
                      prefix="¥"
                      className="dark-input"
                    />
                    {calculatedTotalPrice && (
                      <p className="calculated-hint">
                        成交总价: ¥{calculatedTotalPrice}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 价格错误提示 */}
              <AnimatePresence>
                {errors.price && (
                  <motion.p
                    className="error-text"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {errors.price}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* 其他字段 */}
          <section className="form-section">
            {/* 购买渠道 */}
            <div className="form-field">
              <label>购买渠道</label>
              <AutoComplete
                size="large"
                placeholder="选择或输入购买渠道"
                value={channel}
                onChange={setChannel}
                options={CHANNEL_OPTIONS}
                className="dark-autocomplete"
                filterOption={(inputValue, option) =>
                  option?.value?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
                }
              />
            </div>

            {/* 购买日期 */}
            <div className="form-field">
              <label>购买日期</label>
              <DatePicker
                size="large"
                value={purchaseDate}
                onChange={(date) => date && setPurchaseDate(date)}
                className="dark-datepicker"
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
              />
            </div>

            {/* 备注 */}
            <div className="form-field">
              <label>备注</label>
              <TextArea
                placeholder="添加备注（可选）"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                className="dark-textarea"
                showCount
              />
            </div>

            {/* 照片上传 */}
            <div className="form-field">
              <label>照片凭证 (最多3张)</label>
              <Upload
                listType="picture-card"
                fileList={photos}
                onChange={handlePhotoChange}
                beforeUpload={beforeUpload}
                maxCount={3}
                className="dark-upload"
                itemRender={(_originNode, file, _fileList, actions) => (
                  <div className="upload-item">
                    <img
                      src={file.url || URL.createObjectURL(file.originFileObj!)}
                      alt={file.name}
                    />
                    <div className="upload-actions">
                      <button onClick={actions.preview}><EyeOutlined /></button>
                      <button onClick={actions.remove}><DeleteOutlined /></button>
                    </div>
                  </div>
                )}
              >
                {photos.length < 3 && (
                  <div className="upload-button">
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传</div>
                  </div>
                )}
              </Upload>
            </div>
          </section>

          {/* 底部留白 */}
          <div className="bottom-spacer" />
        </div>

        {/* 保存按钮 */}
        <div className="save-button-wrapper">
          <button
            className="save-button"
            onClick={(e) => {
              createRipple(e)
              handleSave()
            }}
            disabled={isAdding}
          >
            {isAdding ? <LoadingOutlined /> : '保存'}
          </button>
        </div>
      </div>

      {/* 全局样式 - 涟漪动画 */}
      <style>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </motion.div>
  )
}
