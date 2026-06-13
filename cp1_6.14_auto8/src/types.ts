export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'file' | 'number' | 'date';
  title: string;
  description: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface Form {
  _id: string;
  title: string;
  description: string;
  fields: FormField[];
  shareId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
}

export interface Submission {
  _id: string;
  formId: string;
  data: Record<string, any>;
  createdAt: string;
}

export interface FormStats {
  totalSubmissions: number;
  form: Form;
  submissions: Submission[];
}
