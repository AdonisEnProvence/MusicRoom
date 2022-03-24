import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';
import { TokenTypeName } from '@musicroom/types';

export default class TokenType extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column()
    public name: TokenTypeName;
}
