import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import java.util.logging.Logger;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.apache.commons.io.FileUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;


public class CheckSubmissions {
	String device = null;
	private static Logger log =
			 Logger.getLogger(CheckSubmissions.class.getName());
	
	public void check(Connection sd, String basePath) throws SQLException, ApplicationException, IOException {
		log.info("Checking disk");
		
		String sql = "select o.id as oId, o.name as name, p.id as pId, s.ident as ident "
				+ "from organisation o, project p, survey s "
				+ "where o.id = p.o_id "
				+ "and p.id = s.p_id "
				+ "order by o.id, p.id asc";
		PreparedStatement pstmt = null;
		
		String sqlWrite = "insert into disk_usage (o_id, total, upload, media, template, attachments, when_measured) "
				+ "values(?, ?, ?, ?, ?, ?, now())";
		PreparedStatement pstmtWrite = null;
		
		
		String uploadPath = basePath + "/uploadedSurveys/";
		String mediaPath = basePath + "/media/";
		String attachmentsPath = basePath + "/attachments/";
		String templatePath = basePath + "/templates/";
		try {
			pstmtWrite = sd.prepareStatement(sqlWrite);
			
			/*
			 * Write total disk usage for organisation
			 */
			File p = new File("/smap");
			long pSize = p.getTotalSpace() / 1000000;	// MB
			writeUsage(pstmtWrite, 0, pSize, 0, 0, 0, 0);
			log.info("Total usage: " + pSize);
			
			pstmt = sd.prepareStatement(sql);
			ResultSet rs = pstmt.executeQuery();
			
			int currentProject = -1;
			int currentOrg = -1;
			String currentOrgName = null;
			long uploadSize = 0;
			long mediaSize = 0;
			long templateSize = 0;
			long attachmentsSize = 0;
			while(rs.next()) {
				int oId = rs.getInt("oId");
				int pId = rs.getInt("pId");
				String organisation = rs.getString("name");
				String surveyIdent = rs.getString("ident");
				
				if(currentOrg >= 0 && oId != currentOrg) {
					writeUsage(pstmtWrite, currentOrg, pSize, uploadSize, mediaSize, templateSize, attachmentsSize);
					log.info("Usage for organisation: " + currentOrgName + " : " 
							+ uploadSize + " : " + mediaSize + " : " + templateSize + " ; " + attachmentsSize);
					
					uploadSize = 0;
					mediaSize = 0;
					templateSize = 0;
					attachmentsSize = 0;
				} 
				
				if(currentProject != pId) {
					File templateDir = new File(templatePath + pId);
					templateSize += getDirUsage(templateDir);
				}
				
				currentOrgName = organisation;
				currentOrg = oId;
				currentProject = pId;
				
				File uploadDir = new File(uploadPath + surveyIdent);
				uploadSize += getDirUsage(uploadDir);
				
				File mediaDir = new File(mediaPath + surveyIdent);
				mediaSize += getDirUsage(mediaDir);
				
				File attachmentsDir = new File(attachmentsPath + surveyIdent);
				attachmentsSize += getDirUsage(attachmentsDir);
		
			}
			writeUsage(pstmtWrite, currentOrg, pSize, uploadSize, mediaSize, templateSize, attachmentsSize);
			log.info("Usage for organisation: " + currentOrgName + " : " + uploadSize + " : " + mediaSize + " : " + templateSize);
			
			
		} finally {
			try {pstmt.close();} catch(Exception e) {}
			try {pstmtWrite.close();} catch(Exception e) {}
		}
	}
	
	
	private void writeUsage(PreparedStatement pstmt, int org, long totalSize, long uploadSize, long mediaSize, 
			long templateSize, long attachmentsSize) throws SQLException {
		pstmt.setInt(1, org);
		pstmt.setLong(2, totalSize);
		pstmt.setLong(3, uploadSize);
		pstmt.setLong(4, mediaSize);
		pstmt.setLong(5, templateSize);
		pstmt.setLong(6, attachmentsSize);
		pstmt.executeUpdate();
	}
	
	private long getDirUsage(File dir) throws IOException {
		long size = 0;
		if(dir.exists()) {
			InputStreamReader is = null;
			BufferedReader br = null;
			try {
				Process p = Runtime.getRuntime().exec("du -d0 -m " + dir.getAbsolutePath());
				is = new InputStreamReader(p.getInputStream());
				br = new BufferedReader(is); 
				String resp = br.readLine();
				if(resp != null) {
					String [] respArray = resp.trim().split("\\s");
					size = Long.parseLong(respArray[0].trim());
				}
			} finally {
				is.close();
				br.close();
			}
		}
		return size;
	}
	
	void checkRef(Connection sd, String basePath) throws SQLException, ApplicationException {
		String updateSQL = "update upload_event set file_path = ? where ue_id = ?;";
		PreparedStatement pstmt = sd.prepareStatement(updateSQL);
		
		Statement stmtSD = sd.createStatement();
		String sql = "select ue_id, file_name, survey_name, s_id from upload_event where file_path is null;";
		ResultSet uploads = stmtSD.executeQuery(sql);
		
		// Get the uploads
		while(uploads.next()) {
			
			String fileName = uploads.getString("file_name").toLowerCase();
			String sId = uploads.getString("s_id");
			int ueId = uploads.getInt("ue_id");
			
			if(sId == null) {
				log.info("    Obsolete survey: " + fileName + " not moved");
			} else {	
				
				// Move the xml file
				File oldFile = new File(basePath + "/uploadedSurveys/" + fileName);
				
				if(!oldFile.exists()) {
					// log.info("    Deleted instance: " + fileName + " not moved");
				} else {
					log.info("    Moving File:" + fileName + " survey Id: " + sId);
				
					String instanceDir = String.valueOf(UUID.randomUUID());
					String surveyPath = basePath + "/uploadedSurveys/" +  sId;
					String instancePath = surveyPath + "/" + instanceDir;
					String newPath = instancePath + "/" + instanceDir + ".xml";
					File folder = new File(surveyPath);
					File newFile = new File(newPath);
					
					try {
							FileUtils.forceMkdir(folder);
							folder = new File(instancePath);
							FileUtils.forceMkdir(folder);	
							
							FileUtils.moveFile(oldFile, newFile);
							System.out.println("        File moved to: " + newPath);
						
							// Update the upload event

							pstmt.setString(1, newPath);
							pstmt.setInt(2, ueId);
							pstmt.executeUpdate();
				    
						// Get the attachments in this survey (if any)
						// Get the connection details for the meta data database
						DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
						DocumentBuilder db = null;
						Document xmlConf = null;			
				
						db = dbf.newDocumentBuilder();
						xmlConf = db.parse(newFile);
						
						Node n = xmlConf.getFirstChild();
						String device = null;
						findFiles(n, basePath, sId, instanceDir);	// Move attachments
					
					} catch (Exception e) {
						e.printStackTrace();
					}
				}
			}
		}
	}
	
	void findFiles(Node n, String basePath, String sId, String instanceDir) throws IOException {
		
		if(n.getNodeType() == Node.ELEMENT_NODE) {
			String name = n.getNodeName();
			String content = n.getTextContent();
			
			//log.info("Node: " + name + " : " + content);
			// Device always comes before any attachments
			if(name.equals("_device") || name.equals("device")) {
				device = content;
			} else if(device != null) {
				int idx = content.lastIndexOf(".");
	            if (idx != -1) {
	            	moveFile(device, content, basePath, sId, instanceDir);
	            }
				
			}
		}
		
		if(n.hasChildNodes()) {
			NodeList nl = n.getChildNodes();
			for(int i = 0; i < nl.getLength(); i++) {
				findFiles(nl.item(i), basePath, sId, instanceDir);
			}
		} 
			
	}
	
	void moveFile(String device, String filename, String basePath, String sId, 
			String instanceDir) throws IOException {
		String sourceFile = basePath + "/uploadedSurveys/" + device + "_" + filename;
		String targetFile = basePath + "/uploadedSurveys/" + sId + "/" + instanceDir + "/" + filename;

		File source = new File(sourceFile);
		if(source.exists()) {
			File target = new File(targetFile);
			log.info("        Moving Attachment: " + sourceFile + " to " + targetFile);
			try {
				FileUtils.moveFile(source, target);
			} catch (Exception e) {
				log.info("        Source file not found: " + sourceFile);
			}
		}
	}

}
