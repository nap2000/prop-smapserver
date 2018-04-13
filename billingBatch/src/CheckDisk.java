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

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.apache.commons.io.FileUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;


public class CheckDisk {
	String device = null;
	
	public void check(Connection sd, String basePath) throws SQLException, ApplicationException, IOException {
		System.out.println("Checking disk");
		
		String sql = "select o.id as oId, o.name as name, p.id as pId, s.ident as ident "
				+ "from organisation o, project p, survey s "
				+ "where o.id = p.o_id "
				+ "and p.id = s.p_id "
				+ "order by o.id, p.id asc";
		PreparedStatement pstmt = null;
		
		String uploadPath = basePath + "/uploadedSurveys/";
		String mediaPath = basePath + "/media/";
		String attachmentsPath = basePath + "/attachments/";
		String templatePath = basePath + "/templates/";
		try {
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
					System.out.println("Usage for organisation: " + currentOrgName + " : " 
							+ uploadSize + " : " + mediaSize + " : " + templateSize + " ; " + attachmentsSize);
					
					uploadSize = 0;
					mediaSize = 0;
					templateSize = 0;
				} 
				
				if(currentProject != pId) {
					File templateDir = new File(templatePath + pId);
					templateSize += getDirUsage(templateDir);
				}
				
				currentOrgName = organisation;
				currentOrg = oId;
				currentProject = pId;
				
				File uploadDir = new File(uploadPath + surveyIdent);
				File mediaDir = new File(mediaPath + surveyIdent);
				File attachmentsDir = new File(attachmentsPath + surveyIdent);
			
				uploadSize += getDirUsage(uploadDir);
				mediaSize += getDirUsage(mediaDir);
				attachmentsSize += getDirUsage(attachmentsDir);
		
			}
			System.out.println("Usage for organisation: " + currentOrgName + " : " + uploadSize + " : " + mediaSize + " : " + templateSize);
		} finally {
			try {pstmt.close();} catch(Exception e) {}
		}
	}
	
	long getDirUsage(File dir) throws IOException {
		long size = 0;
		if(dir.exists()) {
			 Process p = Runtime.getRuntime().exec("du -d0 -k " + dir.getAbsolutePath());
			 BufferedReader stdInput = new BufferedReader(new  InputStreamReader(p.getInputStream())); 
            BufferedReader stdError = new BufferedReader(new  InputStreamReader(p.getErrorStream())); 
            String resp = stdInput.readLine();
            if(resp != null) {
           	 	String [] respArray = resp.trim().split("\\s");
           	 	size = Long.parseLong(respArray[0].trim());
            }
            String err = null;
            while ((err = stdError.readLine()) != null) { 
                  System.out.println(err); 
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
				System.out.println("    Obsolete survey: " + fileName + " not moved");
			} else {	
				
				// Move the xml file
				File oldFile = new File(basePath + "/uploadedSurveys/" + fileName);
				
				if(!oldFile.exists()) {
					// System.out.println("    Deleted instance: " + fileName + " not moved");
				} else {
					System.out.println("    Moving File:" + fileName + " survey Id: " + sId);
				
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
			
			//System.out.println("Node: " + name + " : " + content);
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
			System.out.println("        Moving Attachment: " + sourceFile + " to " + targetFile);
			try {
				FileUtils.moveFile(source, target);
			} catch (Exception e) {
				System.out.println("        Source file not found: " + sourceFile);
			}
		}
	}

}
