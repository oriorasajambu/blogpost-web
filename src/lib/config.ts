import 'server-only';
import { parseConfig } from './config-policy';
export const getConfig = () => parseConfig(process.env);
