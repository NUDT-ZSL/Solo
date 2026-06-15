import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 40 }: { size?: number }) => {
  const colors = ['#E74C3C', '#F1C40F', '#3498DB', '#2ECC71'];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '4px solid transparent',
          borderTopColor: colors[0],
          borderRightColor: colors[1],
          borderBottomColor: colors[2],
          borderLeftColor: colors[3],
        }}
      />
    </div>
  );
};

export default LoadingSpinner;
