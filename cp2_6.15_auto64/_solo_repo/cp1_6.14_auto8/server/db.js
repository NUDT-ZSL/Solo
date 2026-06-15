import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data');

const forms = Datastore.create({
  filename: path.join(dbPath, 'forms.db'),
  autoload: true,
});

const submissions = Datastore.create({
  filename: path.join(dbPath, 'submissions.db'),
  autoload: true,
});

export const db = {
  forms: {
    async create(formData) {
      return await forms.insert({
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },

    async findAll(limit = 10) {
      return await forms.find({}).sort({ createdAt: -1 }).limit(limit);
    },

    async findById(id) {
      return await forms.findOne({ _id: id });
    },

    async findByShareId(shareId) {
      return await forms.findOne({ shareId });
    },

    async findOne(query) {
      return await forms.findOne(query);
    },

    async update(id, formData) {
      return await forms.update(
        { _id: id },
        { $set: { ...formData, updatedAt: new Date().toISOString() } },
        { returnUpdatedDocs: true }
      );
    },

    async remove(id) {
      return await forms.remove({ _id: id });
    },
  },

  submissions: {
    async create(submissionData) {
      return await submissions.insert({
        ...submissionData,
        createdAt: new Date().toISOString(),
      });
    },

    async findByFormId(formId) {
      return await submissions.find({ formId }).sort({ createdAt: -1 });
    },

    async countByFormId(formId) {
      return await submissions.count({ formId });
    },

    async remove(id) {
      return await submissions.remove({ _id: id });
    },
  },

  stats: {
    async getFormStats(formId) {
      const subs = await submissions.find({ formId });
      const form = await forms.findOne({ _id: formId });
      
      return {
        totalSubmissions: subs.length,
        form,
        submissions: subs,
      };
    },

    async getDashboardStats() {
      const allForms = await forms.find({});
      const allSubs = await submissions.find({});
      
      const formStats = await Promise.all(
        allForms.map(async (form) => ({
          ...form,
          submissionCount: await submissions.count({ formId: form._id }),
        }))
      );

      return {
        totalForms: allForms.length,
        totalSubmissions: allSubs.length,
        recentForms: formStats.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 10),
      };
    },
  },
};

export default db;
