export interface EarthquakeRecord {
  id: string;
  timestamp: number;
  longitude: number;
  latitude: number;
  magnitude: number;
  depth: number;
  location: string;
}

const EARTHQUAKE_LOCATIONS: { lat: number; lon: number; name: string }[] = [
  { lat: 35.6762, lon: 139.6503, name: '日本东京附近海域' },
  { lat: -33.8688, lon: 151.2093, name: '澳大利亚悉尼东部' },
  { lat: 37.7749, lon: -122.4194, name: '美国旧金山湾区' },
  { lat: -33.4489, lon: -70.6693, name: '智利圣地亚哥附近' },
  { lat: 17.9869, lon: -76.7944, name: '牙买加金斯顿近海' },
  { lat: 51.5074, lon: -0.1278, name: '英国伦敦南部' },
  { lat: 28.6139, lon: 77.2090, name: '印度新德里北部' },
  { lat: -6.2088, lon: 106.8456, name: '印度尼西亚雅加达' },
  { lat: 55.7558, lon: 37.6173, name: '俄罗斯莫斯科东部' },
  { lat: 30.0444, lon: 31.2357, name: '埃及开罗附近' },
  { lat: 14.5995, lon: 120.9842, name: '菲律宾马尼拉海域' },
  { lat: 41.9028, lon: 12.4964, name: '意大利罗马中部' },
  { lat: 1.3521, lon: 103.8198, name: '新加坡附近海域' },
  { lat: 34.0522, lon: -118.2437, name: '美国洛杉矶地区' },
  { lat: -15.7942, lon: -47.8825, name: '巴西巴西利亚附近' },
  { lat: -22.9068, lon: -43.1729, name: '巴西里约热内卢' },
  { lat: 25.276987, lon: 55.296249, name: '阿联酋迪拜附近' },
  { lat: 40.7128, lon: -74.0060, name: '美国纽约州北部' },
  { lat: 43.6532, lon: -79.3832, name: '加拿大多伦多地区' },
  { lat: 48.8566, lon: 2.3522, name: '法国巴黎东部' },
  { lat: -1.2921, lon: 36.8219, name: '肯尼亚内罗毕附近' },
  { lat: 39.9042, lon: 116.4074, name: '中国北京西北部' },
  { lat: 31.2304, lon: 121.4737, name: '中国上海东部海域' },
  { lat: 22.3193, lon: 114.1694, name: '中国香港附近' },
  { lat: 13.7563, lon: 100.5018, name: '泰国曼谷北部' },
  { lat: -4.4424, lon: 153.9393, name: '巴布亚新几内亚' },
  { lat: 64.1466, lon: -21.9426, name: '冰岛雷克雅未克' },
  { lat: 35.6892, lon: 51.3890, name: '伊朗德黑兰附近' },
  { lat: 37.5665, lon: 126.9780, name: '韩国首尔西部' },
  { lat: -25.7479, lon: 28.2293, name: '南非比勒陀利亚' },
