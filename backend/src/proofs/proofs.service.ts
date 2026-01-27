import { Injectable, NotImplementedException } from "@nestjs/common";

@Injectable()
export class ProofsService {
  async getProofForViewer(
    _id: string,
    _ownerUserId: string,
    _viewerUserId: string | null,
    _token?: string | null,
  ): Promise<any> {
    throw new NotImplementedException("ProofsService.getProofForViewer is not implemented yet");
  }

  async createFileProof(
    _achusrId: string,
    _file: { buffer?: Buffer; size?: number; mimetype?: string; originalname?: string },
    _meta: unknown,
  ): Promise<any> {
    throw new NotImplementedException("ProofsService.createFileProof is not implemented yet");
  }

  async createUrlProof(_achusrId: string, _sourceUrl: string, _meta: unknown): Promise<any> {
    throw new NotImplementedException("ProofsService.createUrlProof is not implemented yet");
  }

  async getProofForOwner(_id: string, _achusrId: string): Promise<any> {
    throw new NotImplementedException("ProofsService.getProofForOwner is not implemented yet");
  }

  async getProofForFile(
    _id: string,
    _ownerUserId?: string | null,
    _viewerUserId?: string | null,
    _token?: string | null,
  ): Promise<any> {
    throw new NotImplementedException("ProofsService.getProofForFile is not implemented yet");
  }

  async anchorProof(_id: string, _achusrId: string): Promise<any> {
    throw new NotImplementedException("ProofsService.anchorProof is not implemented yet");
  }

  async listProofs(
    _achusrId: string,
    _viewerUserId: string | null,
    _filters: {
      achievementId?: string;
      badgeTokenId?: string;
      kind?: string;
      limit?: string;
      cursor?: string;
    },
  ): Promise<any> {
    throw new NotImplementedException("ProofsService.listProofs is not implemented yet");
  }
}
