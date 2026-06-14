export interface Device {
  id: string
  name: string
  imageUrl: string
  status: 'available' | 'borrowed' | 'maintenance'
  description: string
}

export interface Reservation {
  id: string
  deviceId: string
  deviceName: string
  userId: string
  userName: string
  date: string
  timeSlot: string
  note: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
}

export const devices: Device[] = [
  {
    id: 'd1',
    name: '光学显微镜',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=optical%20microscope%20in%20laboratory%20professional%20equipment%20clean%20white%20background&image_size=square',
    status: 'available',
    description: '高分辨率光学显微镜，放大倍率40x-1000x，适用于细胞观察和材料分析'
  },
  {
    id: 'd2',
    name: '离心机',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=laboratory%20centrifuge%20machine%20professional%20equipment%20white%20background&image_size=square',
    status: 'available',
    description: '高速离心机，最高转速15000rpm，适用于样品分离和纯化'
  },
  {
    id: 'd3',
    name: 'PCR 仪',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=PCR%20thermal%20cycler%20machine%20laboratory%20professional%20white%20background&image_size=square',
    status: 'borrowed',
    description: '梯度PCR仪，96孔板，温度范围4-99°C'
  },
  {
    id: 'd4',
    name: '恒温水浴锅',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=water%20bath%20laboratory%20equipment%20professional%20white%20background&image_size=square',
    status: 'maintenance',
    description: '数显恒温水浴锅，温控精度0.1°C，容量6L'
  },
  {
    id: 'd5',
    name: '电子分析天平',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=analytical%20balance%20scale%20laboratory%20precision%20white%20background&image_size=square',
    status: 'available',
    description: '精密电子天平，量程220g，精度0.1mg'
  },
  {
    id: 'd6',
    name: '紫外分光光度计',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=UV%20spectrophotometer%20laboratory%20equipment%20professional%20white%20background&image_size=square',
    status: 'available',
    description: '双光束紫外可见分光光度计，波长范围190-1100nm'
  }
]

export const reservations: Reservation[] = []
