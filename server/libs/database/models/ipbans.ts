import {
    Sequelize,
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    NonAttribute,
} from "@sequelize/core";
import {
    Attribute,
    PrimaryKey,
    AutoIncrement,
    HasMany,
    NotNull,
    Default,
    Table,
} from "@sequelize/core/decorators-legacy";
import Server from "../../networking";


@Table({
    indexes: [
        { unique: true, fields: ["IP"]},
    ]
})
export default class IPBan extends Model<
    InferAttributes<IPBan>,
    InferCreationAttributes<IPBan>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare ID: CreationOptional<number>;
    @Attribute(DataTypes.STRING)
    @NotNull
    declare IP: String;
    @Attribute(DataTypes.BOOLEAN)
    @Default(true)
    @NotNull
    declare permban: CreationOptional<boolean>;
    @Attribute(DataTypes.BOOLEAN)
    @Default(false)
    @NotNull
    declare tempban: CreationOptional<boolean>;
    @Attribute(DataTypes.INTEGER)
    @Default(0)
    @NotNull
    declare expiryDate: CreationOptional<number>;
    @Attribute(DataTypes.STRING)
    @Default("")
    @NotNull
    declare reason: CreationOptional<string>;

}