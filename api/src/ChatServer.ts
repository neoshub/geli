import * as socketIo from 'socket.io';
import {SocketIOEvent} from './models/SocketIOEvent';
import {IMessageModel, Message} from './models/Message';
import * as jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import config from './config/main';
import {errorCodes} from './config/errorCodes';
import {User, IUserModel} from './models/User';
import {ChatRoom} from './models/ChatRoom';
import {ISocketIOMessagePost, ISocketIOMessage, SocketIOMessageType, IMessage} from './models/SocketIOMessage';
import {BadRequestError} from 'routing-controllers';
import {extractMongoId} from './utilities/ExtractMongoId';
import * as Raven from 'raven';

// FIXME: This is currently WIP to fix the #989 issues.
export default class ChatServer {

  private io: socketIo.Server;

  constructor(server: any) {
    this.io = socketIo(server, {path: '/chat'});

    this.io.use((socket: any, next) => {
      // ATM this and the passportJwtStrategyFactory are the only users of the 'cookie' package.
      const token = cookie.parse(socket.handshake.headers.cookie).token;
      const roomId = socket.handshake.query.room;

      jwt.verify(token, config.secret, async (err: any, decoded: any) => {
        const [user, room] = await Promise.all([
          User.findById(decoded._id).exec(),
          ChatRoom.findById(roomId).exec()
        ]);

        if (err || !user || !room) {
          next(new Error('Not authorized')); // FIXME: Use/Add one of the errorCodes?
        }

        socket.chatName = await this.obtainChatName(user, roomId);
        socket.userId = decoded._id;
        next();
      });
    });
  }

  async obtainChatName (user: IUserModel, roomId: string) {
    const lastMessage = await Message.findOne({room: roomId, author: user}).sort({createdAt: -1});
    if (lastMessage) {
      return lastMessage.chatName;
    } else {
      // Note: We probably should improve the random name generation, especially for better readability.
      return user.role + Date.now();
    }
  }

  init() {
    this.io.on(SocketIOEvent.CONNECT, (socket: any) => {
      const userId = socket.userId;
      const roomId = socket.handshake.query.room;
      const chatName = socket.chatName;
      socket.join(roomId);
      socket.on(SocketIOEvent.MESSAGE, (message: ISocketIOMessagePost) => this.onMessage(message, userId, roomId, chatName));
    });
  }

  async onMessage(socketIOMessagePost: ISocketIOMessagePost, userId: string, roomId: string, chatName: string) {
    const message: IMessage = {
      _id: undefined,
      content: socketIOMessagePost.content,
      author: userId,
      room: roomId,
      chatName,
      comments: []
    };
    const socketIOMessage: ISocketIOMessage = {
      meta: socketIOMessagePost.meta,
      message
    };

    if (socketIOMessagePost.meta.type === SocketIOMessageType.COMMENT) {
      let foundMessage: IMessageModel = await Message.findById(socketIOMessagePost.meta.parent);
      if (extractMongoId(foundMessage.room) !== roomId) {
        Raven.captureException(new BadRequestError(errorCodes.chat.badParent.code));
      }

      if (foundMessage) {
        foundMessage.comments.push(message);
        foundMessage = await foundMessage.save();
        socketIOMessage.message = foundMessage.comments.pop();
        this.io.in(roomId).emit(SocketIOEvent.MESSAGE, socketIOMessage);
      }
    } else {
      let newMessage = new Message(message);
      newMessage = await newMessage.save();
      socketIOMessage.message = newMessage;
      this.io.in(roomId).emit(SocketIOEvent.MESSAGE, socketIOMessage);
    }
  }
}
