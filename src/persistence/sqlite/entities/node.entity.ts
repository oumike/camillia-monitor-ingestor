import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'nodes' })
export class NodeEntity {
  /**
   * The node id is the key, not the node number. Both identify the same node and
   * are derived from one another, but the id is what a node calls itself in its
   * own NodeInfo packet and what every other Meshtastic tool displays — so
   * keying on it means an upsert matches on the value that came off the air.
   */
  @PrimaryColumn({ type: 'text', name: 'node_id' })
  nodeId!: string;

  @Index('idx_nodes_node_num')
  @Column({ type: 'integer', name: 'node_num' })
  nodeNum!: number;

  @Column({ type: 'text', name: 'long_name', nullable: true })
  longName!: string | null;

  @Column({ type: 'text', name: 'short_name', nullable: true })
  shortName!: string | null;

  @Column({ type: 'text', name: 'hw_model', nullable: true })
  hwModel!: string | null;

  /**
   * Raw HardwareModel enum value, kept alongside the name so a model the
   * firmware could not name is still identifiable later. `hwModel` reads
   * 'Unknown' in that case; this is what a lookup would resolve from.
   */
  @Column({ type: 'integer', name: 'hw_model_num', nullable: true })
  hwModelNum!: number | null;

  @Column({ type: 'text', name: 'role', nullable: true })
  role!: string | null;

  @Index('idx_nodes_last_heard_at')
  @Column({ type: 'datetime', name: 'last_heard_at', nullable: true })
  lastHeardAt!: Date | null;

  @Column({ type: 'text', name: 'last_heard_by', nullable: true })
  lastHeardBy!: string | null;

  @Column({ type: 'float', name: 'snr', nullable: true })
  snr!: number | null;

  @Column({ type: 'integer', name: 'rssi', nullable: true })
  rssi!: number | null;

  @Column({ type: 'integer', name: 'hops_away', nullable: true })
  hopsAway!: number | null;

  @Column({ type: 'boolean', name: 'via_mqtt', default: false })
  viaMqtt!: boolean;

  @Column({ type: 'integer', name: 'latitude_i', nullable: true })
  latitudeI!: number | null;

  @Column({ type: 'integer', name: 'longitude_i', nullable: true })
  longitudeI!: number | null;

  @Column({ type: 'integer', name: 'altitude', nullable: true })
  altitude!: number | null;

  @Column({ type: 'integer', name: 'precision_bits', nullable: true })
  precisionBits!: number | null;

  @Column({ type: 'integer', name: 'battery_level', nullable: true })
  batteryLevel!: number | null;

  @Column({ type: 'float', name: 'voltage', nullable: true })
  voltage!: number | null;

  @CreateDateColumn({ type: 'datetime', name: 'first_heard_at' })
  firstHeardAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
