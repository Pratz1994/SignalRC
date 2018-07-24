using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Linq;
using System;
using Mars.Common.Contracts;
using Mars.Common.Models;
using Mars.Common.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using MongoDB.Bson;

namespace Mars.Services.Profile
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ChatHub : Hub
    {
        IRepository<MessageRoom> _messageRoomRepository;
        IUserAppContext _userAppContext;

        public ChatHub(IRepository<MessageRoom> roomRepository,
                       IUserAppContext userAppContext)
        {
            _messageRoomRepository = roomRepository;
            _userAppContext = userAppContext;
        }

        public void SendToAll(string name, string message)
        {
            Clients.All.SendAsync("sendToAll", name, message);
        }

        public void SendMessageToUser(string userId, string handle, string message)
        {
            var current = _userAppContext.CurrentUserId;
            var room = GetRoom(current, userId);
            Clients.Group(room.Id).SendAsync("sendMsg", room, current, message);
            room.Messages.Add(new Message
            {
                CreatedBy = current,
                CreatedOn = DateTime.UtcNow,
                TextMsg = message,
                Id = ObjectId.GenerateNewId().ToString(),
                IsDeleted = false
            });
            _messageRoomRepository.Update(room);
        }

        public Task LeaveGroup(string roomId, string userName)
        {
            Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
            return Clients.Groups(roomId).SendAsync("leaveChat", userName);
        }

        public override async Task OnConnectedAsync()
        {
            string currentUserId = _userAppContext.CurrentUserId;
            string userIdTo = this.Context.GetHttpContext().Request.Query["userId"].SingleOrDefault();
            var room = GetRoom(currentUserId, userIdTo);
            await Groups.AddToGroupAsync(Context.ConnectionId, room.Id);
            await Clients.Groups(room.Id).SendAsync("joinChat", room.Id);
            await Clients.Client(Context.ConnectionId).SendAsync("sendHistory", room.Messages);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var roomId = this.Context.GetHttpContext().Request.Query["roomId"].SingleOrDefault();
            var userName = this.Context.GetHttpContext().Request.Query["userName"].SingleOrDefault();
            await Clients.Groups(roomId).SendAsync("leaveChat", userName);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
            await base.OnDisconnectedAsync(exception);
        }


        private MessageRoom GetRoom(string id1, string id2)
        {
            // This is currently dumb about getting the last room
            // Better way would be either to store dates and OrderBy()
            // or walk the list and take the last one
            var room = _messageRoomRepository.Get(x =>
                (x.UserId1 == id1 && x.UserId2 == id2)
                || (x.UserId1 == id2 && x.UserId2 == id1)
            ).LastOrDefault();
            if (room == null)
            {
                room = new MessageRoom
                {
                    UserId1 = id1,
                    UserId2 = id2,
                    Messages = new System.Collections.Generic.List<Message>(),
                    previousRoomId = null,
                    IsDeleted = false
                };
                _messageRoomRepository.Add(room);
            }
            return room;
        }

        private MessageRoom GetRoom(string roomId)
        {
            var room = _messageRoomRepository.GetByIdAsync(roomId);
            if (room == null)
            {
                throw new FormatException("Room does not exist!");
            }
            return room;
        }

    }
}
}