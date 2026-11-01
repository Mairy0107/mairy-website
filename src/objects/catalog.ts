import type { ObjectKey, SceneObject } from '../../shared/interaction';
import type { Group } from 'three';

// 离线预览沿用原色；在线时用数据库的中文名称、样式名和排序覆盖。
export const DEFAULT_OBJECTS: SceneObject[] = [
  { objectKey: 'store', displayName: '便利店', styleLabels: ['原版暖白', '深青夜店', '樱粉便利'], defaultStyle: 0, sortOrder: 0 },
  { objectKey: 'vending', displayName: '自动贩卖机', styleLabels: ['月之苏打粉', '薄荷蓝机', '柑橘黄机'], defaultStyle: 0, sortOrder: 1 },
  { objectKey: 'bike', displayName: '自行车', styleLabels: ['暖金车架', '薄荷绿', '夜蓝车架'], defaultStyle: 0, sortOrder: 2 },
  { objectKey: 'umbrella', displayName: '雨伞架', styleLabels: ['原色三伞', '蓝紫雨伞', '朱红雨伞'], defaultStyle: 0, sortOrder: 3 },
  { objectKey: 'bins', displayName: '垃圾桶', styleLabels: ['青灰双桶', '暖木色', '深蓝分类'], defaultStyle: 0, sortOrder: 4 },
  { objectKey: 'lamp', displayName: '路灯', styleLabels: ['暖黄灯', '冷白灯', '霓虹紫'], defaultStyle: 0, sortOrder: 5 },
  { objectKey: 'notice', displayName: '公告栏', styleLabels: ['夏祭海报', '猫咪寻主', '夜市传单'], defaultStyle: 0, sortOrder: 6 },
  { objectKey: 'poles', displayName: '电线杆', styleLabels: ['灰杆原色', '木纹杆', '墨绿杆'], defaultStyle: 0, sortOrder: 7 },
  { objectKey: 'guardrail', displayName: '护栏', styleLabels: ['米白护栏', '青钢护栏', '锈橙护栏'], defaultStyle: 0, sortOrder: 8 },
  { objectKey: 'ac', displayName: '空调外机', styleLabels: ['银灰机', '米白机', '暗青机'], defaultStyle: 0, sortOrder: 9 },
];

/** 给完整物件组设置统一标识，射线命中子网格后可向上查找。 */
export function nameObject(object: Group, key: ObjectKey): void {
  object.name = key;
  object.userData.objectKey = key;
  object.userData.displayName = DEFAULT_OBJECTS.find((item) => item.objectKey === key)!.displayName;
}

/** 标记便利店内部/立面部件，绽开时单独位移，悬停显示部件中文名，样式仍归属便利店。 */
export function nameStorePart(object: Group, partId: string, displayName: string): void {
  object.name = partId;
  object.userData.storePart = partId;
  object.userData.displayName = displayName;
  // 不写 objectKey，避免 traverse 时覆盖便利店根组登记。
}

/** 仅参与分解图与悬停命名的附加部件（不进样式目录）。 */
export function nameExplodePart(object: Group, partId: string, displayName: string): void {
  object.name = partId;
  object.userData.explodePart = partId;
  object.userData.displayName = displayName;
}
