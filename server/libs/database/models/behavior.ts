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
@Table({
    indexes: [{ unique: true, fields: ["name"] }],
})
export default class Behavior extends Model<
    InferAttributes<Behavior>,
    InferCreationAttributes<Behavior>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>;
    @Attribute(DataTypes.STRING)
    @NotNull
    declare name: string;
    @Attribute(DataTypes.STRING)
    @NotNull
    declare xmlData: string;
    static async nameExists(name: string): Promise<boolean> {
        const behavior = await Behavior.findOne({
            where: { name: name },
            attributes: ["name"],
        });
        return !!behavior;
    }
    static async getByName(name: string): Promise<Behavior> {
        const behavior = await Behavior.findOne({
            where: { name: name },
        });
        if (behavior) return behavior;
        throw Error("Requested a behavior name that does not exist.");
    }
}
