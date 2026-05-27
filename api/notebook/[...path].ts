/** notebook グループ catch-all (revise_001)。/api/notebook/{edit,list}。 */
import { createGroupRouter } from '../_lib/router';
import edit from './_handlers/edit';
import list from './_handlers/list';

export const config = { runtime: 'nodejs' };

export default createGroupRouter('notebook', {
  edit: edit.fetch,
  list: list.fetch,
});
