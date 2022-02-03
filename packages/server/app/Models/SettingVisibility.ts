import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';
import { UserSettingVisibility } from '@musicroom/types';

export default class SettingVisibility extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column()
    public name: UserSettingVisibility;
}
