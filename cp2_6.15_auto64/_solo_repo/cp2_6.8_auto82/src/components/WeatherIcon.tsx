import React from 'react'
import { WeatherType } from '../types'

interface WeatherIconProps {
  weatherType: WeatherType
}

const SunIcon: React.FC = () => (
  <div className="sun-icon">
    <div className="sun-body" />
    <div className="sun-rays">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="sun-ray"
          style={{ transform: `translateX(-50%) rotate(${i * 30}deg)` }}
        />
      ))}
    </div>
  </div>
)

const CloudIcon: React.FC = () => (
  <div className="cloud-icon">
    <div className="cloud-shape" />
    <div className="cloud-shape" />
    <div className="cloud-shape" />
  </div>
)

const RainIcon: React.FC = () => (
  <div className="rain-icon">
    <div className="rain-cloud">
      <div className="cloud-shape" />
      <div className="cloud-shape" />
      <div className="cloud-shape" />
    </div>
    <div className="rain-drops">
      <div className="raindrop" />
      <div className="raindrop" />
      <div className="raindrop" />
    </div>
  </div>
)

const StormIcon: React.FC = () => (
  <div className="storm-icon">
    <div className="storm-cloud">
      <div className="cloud-shape" />
      <div className="cloud-shape" />
      <div className="cloud-shape" />
    </div>
    <div className="lightning" />
  </div>
)

const SnowIcon: React.FC = () => (
  <div className="snow-icon">
    <div className="snow-cloud">
      <div className="cloud-shape" />
      <div className="cloud-shape" />
      <div className="cloud-shape" />
    </div>
    <div className="snow-flakes">
      <div className="snowflake">❄</div>
      <div className="snowflake">❄</div>
      <div className="snowflake">❄</div>
    </div>
  </div>
)

export const WeatherIcon: React.FC<WeatherIconProps> = ({ weatherType }) => {
  switch (weatherType) {
    case 'sunny':
      return <SunIcon />
    case 'cloudy':
      return <CloudIcon />
    case 'rainy':
      return <RainIcon />
    case 'stormy':
      return <StormIcon />
    case 'snowy':
      return <SnowIcon />
    default:
      return <SunIcon />
  }
}
