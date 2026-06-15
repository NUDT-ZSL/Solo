import { Link } from 'react-router-dom';
import type { Project } from '../../server/models';
import ProgressBar from './ProgressBar';
import { getDaysRemaining } from '@/utils/helpers';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const progress = (project.currentAmount / project.goalAmount) * 100;
  const daysRemaining = project.endDate ? getDaysRemaining(project.endDate) : 0;

  return (
    <Link
      to={`/project/${project.id}`}
      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-xl hover:scale-[1.03] transition-all duration-[0.25s] ease-out cursor-pointer"
      style={{ width: '280px' }}
    >
      <div className="w-full h-40 rounded-lg overflow-hidden mb-4 bg-gray-200">
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
            <span className="text-white text-lg font-semibold">
              {project.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold text-[#1f2937] mb-2 line-clamp-1">
        {project.title}
      </h3>

      <p className="text-sm text-[#4b5563] mb-4 line-clamp-2 h-10">
        {project.description}
      </p>

      <div className="mb-3">
        <ProgressBar
          current={project.currentAmount}
          goal={project.goalAmount}
          height={8}
          showText={false}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-[#4b5563]">
          <span className="font-semibold text-[#1f2937]">¥{project.currentAmount.toLocaleString()}</span>
          <span className="mx-1">/</span>
          <span>¥{project.goalAmount.toLocaleString()}</span>
        </div>
        <div className="text-[#4b5563]">
          {daysRemaining > 0 ? (
            <span>剩余 {daysRemaining} 天</span>
          ) : (
            <span className="text-green-600">已结束</span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            progress >= 100
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {progress >= 100 ? '已达成' : `已完成 ${progress.toFixed(0)}%`}
        </span>
      </div>
    </Link>
  );
};

export default ProjectCard;
