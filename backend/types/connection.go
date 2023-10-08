package types

type ConnectionCategory int

type ConnectionConfig struct {
	Name          string             `json:"name" yaml:"name"`
	Group         string             `json:"group,omitempty" yaml:"-"`
	Addr          string             `json:"addr,omitempty" yaml:"addr,omitempty"`
	Port          int                `json:"port,omitempty" yaml:"port,omitempty"`
	Username      string             `json:"username,omitempty" yaml:"username,omitempty"`
	Password      string             `json:"password,omitempty" yaml:"password,omitempty"`
	DefaultFilter string             `json:"defaultFilter,omitempty" yaml:"default_filter,omitempty"`
	KeySeparator  string             `json:"keySeparator,omitempty" yaml:"key_separator,omitempty"`
	ConnTimeout   int                `json:"connTimeout,omitempty" yaml:"conn_timeout,omitempty"`
	ExecTimeout   int                `json:"execTimeout,omitempty" yaml:"exec_timeout,omitempty"`
	DBFilterType  string             `json:"dbFilterType" yaml:"db_filter_type,omitempty"`
	DBFilterList  []int              `json:"dbFilterList" yaml:"db_filter_list,omitempty"`
	MarkColor     string             `json:"markColor,omitempty" yaml:"mark_color,omitempty"`
	SSH           ConnectionSSH      `json:"ssh,omitempty" yaml:"ssh,omitempty"`
	Sentinel      ConnectionSentinel `json:"sentinel,omitempty" yaml:"sentinel,omitempty"`
}

type Connection struct {
	ConnectionConfig `json:",inline" yaml:",inline"`
	Type             string       `json:"type,omitempty" yaml:"type,omitempty"`
	Connections      []Connection `json:"connections,omitempty" yaml:"connections,omitempty"`
}

type Connections []Connection

type ConnectionGroup struct {
	GroupName   string       `json:"groupName" yaml:"group_name"`
	Connections []Connection `json:"connections" yaml:"connections"`
}

type ConnectionDB struct {
	Name    string `json:"name"`
	Index   int    `json:"index"`
	Keys    int    `json:"keys"`
	Expires int    `json:"expires,omitempty"`
	AvgTTL  int    `json:"avgTtl,omitempty"`
}

type ConnectionSSH struct {
	Enable     bool   `json:"enable" yaml:"enable"`
	Addr       string `json:"addr,omitempty" yaml:"addr,omitempty"`
	Port       int    `json:"port,omitempty" yaml:"port,omitempty"`
	LoginType  string `json:"loginType" yaml:"login_type"`
	Username   string `json:"username" yaml:"username,omitempty"`
	Password   string `json:"password,omitempty" yaml:"password,omitempty"`
	PKFile     string `json:"pkFile,omitempty" yaml:"pk_file,omitempty"`
	Passphrase string `json:"passphrase,omitempty" yaml:"passphrase,omitempty"`
}

type ConnectionSentinel struct {
	Enable   bool   `json:"enable" yaml:"enable"`
	Master   string `json:"master" yaml:"master"`
	Username string `json:"username,omitempty" yaml:"username,omitempty"`
	Password string `json:"password,omitempty" yaml:"password,omitempty"`
}
