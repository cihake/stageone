/**
 * Message model — direct messages between users (typically a booker contacting
 * an artist). Per spec §5.1.2 ("send and receive messages with booking
 * contacts so that initial outreach can happen inside StageOne").
 *
 * Threading: a `parentMessageId` lets replies form a chain without a separate
 * Conversation collection in v1.0. Conversations are reconstructed at read
 * time by walking parents/children. If usage gets heavy, promote to a real
 * Conversation collection in v1.1.
 */
import type { Types } from 'mongoose';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export interface IMessage {
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  subject: string;
  body: string;
  isRead: boolean;
  readAt: Date | null;
  parentMessageId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IMessageMethods {
  markRead(): Promise<MessageDocument>;
}

type MessageModel = Model<IMessage, Record<string, never>, IMessageMethods>;
export type MessageDocument = HydratedDocument<IMessage, IMessageMethods>;

const messageSchema = new Schema<IMessage, MessageModel, IMessageMethods>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      default: '',
      trim: true,
      maxlength: 140,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    parentMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// "My inbox, newest first" — drives the Messages page in the artist dashboard.
messageSchema.index({ recipientId: 1, createdAt: -1 });

// "Unread badge count" — drives the header notification dot.
messageSchema.index({ recipientId: 1, isRead: 1 });

// Conversation walk — find replies to a given message.
messageSchema.index({ parentMessageId: 1 });

messageSchema.methods.markRead = async function markRead(
  this: MessageDocument,
): Promise<MessageDocument> {
  if (this.isRead) return this;
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

export const Message = model<IMessage, MessageModel>('Message', messageSchema);
