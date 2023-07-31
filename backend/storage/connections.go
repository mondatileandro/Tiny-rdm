package storage

import (
	"errors"
	"gopkg.in/yaml.v3"
	"sync"
	"tinyrdm/backend/types"
)

type ConnectionsStorage struct {
	storage *localStorage
	mutex   sync.Mutex
}

func NewConnections() *ConnectionsStorage {
	return &ConnectionsStorage{
		storage: NewLocalStore("connections.yaml"),
	}
}

func (c *ConnectionsStorage) defaultConnections() types.Connections {
	return types.Connections{}
}

func (c *ConnectionsStorage) defaultConnectionItem() types.ConnectionConfig {
	return types.ConnectionConfig{
		Name:          "",
		Addr:          "127.0.0.1",
		Port:          6379,
		Username:      "",
		Password:      "",
		DefaultFilter: "*",
		KeySeparator:  ":",
		ConnTimeout:   60,
		ExecTimeout:   60,
		MarkColor:     "",
	}
}

func (c *ConnectionsStorage) getConnections() (ret types.Connections) {
	b, err := c.storage.Load()
	if err != nil {
		ret = c.defaultConnections()
		return
	}

	if err = yaml.Unmarshal(b, &ret); err != nil {
		ret = c.defaultConnections()
		return
	}
	if len(ret) <= 0 {
		ret = c.defaultConnections()
	}
	//if !sliceutil.AnyMatch(ret, func(i int) bool {
	//	return ret[i].GroupName == ""
	//}) {
	//	ret = append(ret, c.defaultConnections()...)
	//}
	return
}

// GetConnections get all store connections from local
func (c *ConnectionsStorage) GetConnections() (ret types.Connections) {
	return c.getConnections()
}

// GetConnectionsFlat get all store connections from local flat(exclude group level)
func (c *ConnectionsStorage) GetConnectionsFlat() (ret types.Connections) {
	conns := c.getConnections()
	for _, conn := range conns {
		if conn.Type == "group" {
			ret = append(ret, conn.Connections...)
		} else {
			ret = append(ret, conn)
		}
	}
	return
}

// GetConnection get connection by name
func (c *ConnectionsStorage) GetConnection(name string) *types.Connection {
	conns := c.getConnections()

	var findConn func(string, string, types.Connections) *types.Connection
	findConn = func(name, groupName string, conns types.Connections) *types.Connection {
		for i, conn := range conns {
			if conn.Type != "group" {
				if conn.Name == name {
					conns[i].Group = groupName
					return &conns[i]
				}
			} else {
				if ret := findConn(name, conn.Name, conn.Connections); ret != nil {
					return ret
				}
			}
		}
		return nil
	}

	return findConn(name, "", conns)
}

// GetGroup get connection group by name
func (c *ConnectionsStorage) GetGroup(name string) *types.Connection {
	conns := c.getConnections()

	for i, conn := range conns {
		if conn.Type == "group" && conn.Name == name {
			return &conns[i]
		}
	}
	return nil
}

func (c *ConnectionsStorage) saveConnections(conns types.Connections) error {
	b, err := yaml.Marshal(&conns)
	if err != nil {
		return err
	}
	if err = c.storage.Store(b); err != nil {
		return err
	}
	return nil
}

// CreateConnection create new connection
func (c *ConnectionsStorage) CreateConnection(param types.ConnectionConfig) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	conn := c.GetConnection(param.Name)
	if conn != nil {
		return errors.New("duplicated connection name")
	}

	conns := c.getConnections()
	var group *types.Connection
	if len(param.Group) > 0 {
		for i, conn := range conns {
			if conn.Type == "group" && conn.Name == param.Group {
				group = &conns[i]
				break
			}
		}
	}
	if group != nil {
		group.Connections = append(group.Connections, types.Connection{
			ConnectionConfig: param,
		})
	} else {
		if len(param.Group) > 0 {
			// no group matched, create new group
			conns = append(conns, types.Connection{
				Type: "group",
				Connections: types.Connections{
					types.Connection{
						ConnectionConfig: param,
					},
				},
			})
		} else {
			conns = append(conns, types.Connection{
				ConnectionConfig: param,
			})
		}
	}

	return c.saveConnections(conns)
}

// UpdateConnection update existing connection by name
func (c *ConnectionsStorage) UpdateConnection(name string, param types.ConnectionConfig) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	var updated bool
	conns := c.getConnections()
	for i, conn := range conns {
		if conn.Name == name {
			conns[i] = types.Connection{
				ConnectionConfig: param,
			}
			updated = true
		} else if conn.Type == "group" {
			for j, conn2 := range conn.Connections {
				if conn2.Name == name {
					conns[i].Connections[j] = types.Connection{
						ConnectionConfig: param,
					}
					updated = true
					break
				}
			}
		}

		if updated {
			break
		}
	}

	if updated {
		return c.saveConnections(conns)
	}

	return errors.New("connection not found")
}

// RemoveConnection remove special connection
func (c *ConnectionsStorage) RemoveConnection(name string) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	conns := c.getConnections()
	var updated bool
	for i, conn := range conns {
		if conn.Type == "group" {
			for j, subConn := range conn.Connections {
				if subConn.Name == name {
					conns[i].Connections = append(conns[i].Connections[:j], conns[i].Connections[j+1:]...)
					updated = true
					break
				}
			}
		} else if conn.Name == name {
			conns = append(conns[:i], conns[i+1:]...)
			updated = true
			break
		}
		if updated {
			break
		}
	}
	if !updated {
		return errors.New("no match connection")
	}
	return c.saveConnections(conns)
}

// CreateGroup create new group
func (c *ConnectionsStorage) CreateGroup(name string) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	conns := c.getConnections()
	for _, conn := range conns {
		if conn.Type == "group" && conn.Name == name {
			return errors.New("duplicated group name")
		}
	}

	conns = append(conns, types.Connection{
		ConnectionConfig: types.ConnectionConfig{
			Name: name,
		},
		Type: "group",
	})
	return c.saveConnections(conns)
}

// RenameGroup rename group
func (c *ConnectionsStorage) RenameGroup(name, newName string) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	conns := c.getConnections()
	for i, conn := range conns {
		if conn.Type == "group" && conn.Name == name {
			conns[i].Name = newName
			return c.saveConnections(conns)
		}
	}

	return errors.New("group not found")
}

// RemoveGroup remove special group, include all connections under it
func (c *ConnectionsStorage) RemoveGroup(group string, includeConnection bool) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	conns := c.getConnections()
	for i, conn := range conns {
		if conn.Type == "group" && conn.Name == group {
			conns = append(conns[:i], conns[i+1:]...)
			if includeConnection {
				conns = append(conns, conn.Connections...)
			}
			return c.saveConnections(conns)
		}
	}
	return errors.New("group not found")
}
