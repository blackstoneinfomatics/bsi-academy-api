import mongoose from 'mongoose';
import config from '../config/env';

export const initializeMongoDatabase = async () => {
  await mongoose.connect(config.mongo.url);
};