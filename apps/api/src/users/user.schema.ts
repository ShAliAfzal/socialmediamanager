import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export type UserRole = 'admin' | 'client';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, enum: ['admin', 'client'] })
  role!: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'Client', default: null })
  clientId?: Types.ObjectId | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
